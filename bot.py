import logging
import requests
from telegram import Update, ReplyKeyboardMarkup, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext, ConversationHandler
import sqlite3

# Настройка логирования
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

# Состояния для ConversationHandler
REGISTERING, SELECTING_ROLE, STREAMER_CONFIRMATION, VIEWING_STREAMER, RATING_MOVIE, WRITING_REVIEW = range(6)

# Подключение к базе данных SQLite
conn = sqlite3.connect('streamer_app.db', check_same_thread=False)
cursor = conn.cursor()

# Создание таблиц в базе данных
def create_tables():
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            role TEXT,
            twitch_username TEXT,
            followers INTEGER DEFAULT 0
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movies (
            movie_id INTEGER PRIMARY KEY AUTOINCREMENT,
            streamer_id INTEGER,
            title TEXT,
            FOREIGN KEY(streamer_id) REFERENCES users(user_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ratings (
            rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id INTEGER,
            user_id INTEGER,
            score INTEGER,
            review TEXT,
            FOREIGN KEY(movie_id) REFERENCES movies(movie_id),
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    conn.commit()

create_tables()

# Функция для получения OAuth токена Twitch
def get_twitch_oauth_token(client_id, client_secret):
    url = "https://id.twitch.tv/oauth2/token"
    params = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials"
    }
    response = requests.post(url, params=params)
    return response.json().get("access_token")

# Функция для проверки количества подписчиков на Twitch
def check_twitch_followers(twitch_username, client_id, oauth_token):
    url = f"https://api.twitch.tv/helix/users?login={twitch_username}"
    headers = {
        "Client-ID": client_id,
        "Authorization": f"Bearer {oauth_token}"
    }
    response = requests.get(url, headers=headers)
    user_data = response.json().get("data", [])
    
    if not user_data:
        return None
    
    user_id = user_data[0]["id"]
    followers_url = f"https://api.twitch.tv/helix/channels/followers?broadcaster_id={user_id}"
    followers_response = requests.get(followers_url, headers=headers)
    total_followers = followers_response.json().get("total", 0)
    
    return total_followers

# Команда /start
def start(update: Update, context: CallbackContext) -> int:
    reply_keyboard = [['Зритель', 'Стример']]
    update.message.reply_text(
        "Привет! Выберите свою роль:",
        reply_markup=ReplyKeyboardMarkup(reply_keyboard, one_time_keyboard=True)
    )
    return SELECTING_ROLE

# Выбор роли
def select_role(update: Update, context: CallbackContext) -> int:
    role = update.message.text.lower()
    user_id = update.message.from_user.id
    username = update.message.from_user.username

    if role == 'зритель':
        cursor.execute('INSERT OR IGNORE INTO users (user_id, username, role) VALUES (?, ?, ?)', (user_id, username, 'viewer'))
        conn.commit()
        update.message.reply_text("Вы успешно зарегистрировались как зритель!")
        return main_menu(update, context)
    elif role == 'стример':
        update.message.reply_text("Пожалуйста, укажите ваше имя пользователя на Twitch:")
        return STREAMER_CONFIRMATION
    else:
        update.message.reply_text("Пожалуйста, выберите 'Зритель' или 'Стример'.")
        return SELECTING_ROLE

# Подтверждение стримера
def confirm_streamer(update: Update, context: CallbackContext) -> int:
    twitch_username = update.message.text
    user_id = update.message.from_user.id
    username = update.message.from_user.username

    # Получаем OAuth токен Twitch
    client_id = "YOUR_TWITCH_CLIENT_ID"
    client_secret = "YOUR_TWITCH_CLIENT_SECRET"
    oauth_token = get_twitch_oauth_token(client_id, client_secret)

    # Проверяем количество подписчиков
    followers = check_twitch_followers(twitch_username, client_id, oauth_token)

    if followers is None:
        update.message.reply_text("Не удалось найти пользователя на Twitch.")
        return SELECTING_ROLE

    if followers >= 250:
        cursor.execute('INSERT OR IGNORE INTO users (user_id, username, role, twitch_username, followers) VALUES (?, ?, ?, ?, ?)',
                       (user_id, username, 'streamer', twitch_username, followers))
        conn.commit()
        update.message.reply_text(f"Вы успешно зарегистрировались как стример! Ваш Twitch: {twitch_username}")
        return main_menu(update, context)
    else:
        update.message.reply_text("У вас недостаточно подписчиков на Twitch (минимум 250).")
        return SELECTING_ROLE

# Главное меню
def main_menu(update: Update, context: CallbackContext) -> int:
    reply_keyboard = [['Найти стримера', 'Мои фильмы'], ['Оценить фильм', 'Написать рецензию']]
    update.message.reply_text(
        "Главное меню:",
        reply_markup=ReplyKeyboardMarkup(reply_keyboard, one_time_keyboard=True)
    )
    return REGISTERING

# Поиск стримера
def search_streamer(update: Update, context: CallbackContext) -> int:
    update.message.reply_text("Введите имя стримера:")
    return VIEWING_STREAMER

# Просмотр профиля стримера
def view_streamer(update: Update, context: CallbackContext) -> int:
    streamer_name = update.message.text
    cursor.execute('SELECT * FROM users WHERE username = ? AND role = ?', (streamer_name, 'streamer'))
    streamer = cursor.fetchone()

    if streamer:
        streamer_id, _, _, twitch_username, followers = streamer
        cursor.execute('SELECT * FROM movies WHERE streamer_id = ?', (streamer_id,))
        movies = cursor.fetchall()

        movies_list = "\n".join([f"{movie[2]}" for movie in movies])
        update.message.reply_text(
            f"Стример: {streamer_name}\n"
            f"Twitch: {twitch_username}\n"
            f"Подписчики: {followers}\n"
            f"Фильмы:\n{movies_list}"
        )
    else:
        update.message.reply_text("Стример не найден.")

    return main_menu(update, context)

# Оценка фильма
def rate_movie(update: Update, context: CallbackContext) -> int:
    update.message.reply_text("Введите название фильма:")
    return RATING_MOVIE

def process_rating(update: Update, context: CallbackContext) -> int:
    movie_title = update.message.text
    context.user_data['movie_title'] = movie_title
    update.message.reply_text("Введите оценку от 1 до 10:")
    return RATING_MOVIE

def save_rating(update: Update, context: CallbackContext) -> int:
    score = int(update.message.text)
    movie_title = context.user_data['movie_title']
    user_id = update.message.from_user.id

    cursor.execute('SELECT movie_id FROM movies WHERE title = ?', (movie_title,))
    movie = cursor.fetchone()

    if movie:
        movie_id = movie[0]
        cursor.execute('INSERT INTO ratings (movie_id, user_id, score) VALUES (?, ?, ?)', (movie_id, user_id, score))
        conn.commit()
        update.message.reply_text(f"Вы оценили фильм '{movie_title}' на {score} из 10.")
    else:
        update.message.reply_text("Фильм не найден.")

    return main_menu(update, context)

# Написание рецензии
def write_review(update: Update, context: CallbackContext) -> int:
    update.message.reply_text("Введите название фильма:")
    return WRITING_REVIEW

def process_review(update: Update, context: CallbackContext) -> int:
    movie_title = update.message.text
    context.user_data['movie_title'] = movie_title
    update.message.reply_text("Напишите вашу рецензию:")
    return WRITING_REVIEW

def save_review(update: Update, context: CallbackContext) -> int:
    review = update.message.text
    movie_title = context.user_data['movie_title']
    user_id = update.message.from_user.id

    cursor.execute('SELECT movie_id FROM movies WHERE title = ?', (movie_title,))
    movie = cursor.fetchone()

    if movie:
        movie_id = movie[0]
        cursor.execute('INSERT INTO ratings (movie_id, user_id, review) VALUES (?, ?, ?)', (movie_id, user_id, review))
        conn.commit()
        update.message.reply_text(f"Ваша рецензия на фильм '{movie_title}' сохранена.")
    else:
        update.message.reply_text("Фильм не найден.")

    return main_menu(update, context)

# Основная функция
def main() -> None:
    updater = Updater("YOUR_TELEGRAM_BOT_TOKEN")

    dispatcher = updater.dispatcher

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            SELECTING_ROLE: [MessageHandler(Filters.text & ~Filters.command, select_role)],
            STREAMER_CONFIRMATION: [MessageHandler(Filters.text & ~Filters.command, confirm_streamer)],
            REGISTERING: [
                MessageHandler(Filters.regex('^Найти стримера$'), search_streamer),
                MessageHandler(Filters.regex('^Оценить фильм$'), rate_movie),
                MessageHandler(Filters.regex('^Написать рецензию$'), write_review)
            ],
            VIEWING_STREAMER: [MessageHandler(Filters.text & ~Filters.command, view_streamer)],
            RATING_MOVIE: [
                MessageHandler(Filters.text & ~Filters.command, process_rating),
                MessageHandler(Filters.text & ~Filters.command, save_rating)
            ],
            WRITING_REVIEW: [
                MessageHandler(Filters.text & ~Filters.command, process_review),
                MessageHandler(Filters.text & ~Filters.command, save_review)
            ]
        },
        fallbacks=[CommandHandler('start', start)]
    )

    dispatcher.add_handler(conv_handler)

    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()
