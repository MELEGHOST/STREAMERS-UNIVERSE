import logging
import os
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext, ConversationHandler, CallbackQueryHandler
from flask import Flask, jsonify
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
    keyboard = [
        [InlineKeyboardButton("Зритель", callback_data="viewer"),
         InlineKeyboardButton("Стример", callback_data="streamer")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    update.message.reply_text(
        "<b>Добро пожаловать!</b>\n\n"
        "Этот бот поможет вам найти стримеров, оценить фильмы и написать рецензии.\n"
        "Выберите свою роль ниже:",
        parse_mode="HTML",
        reply_markup=reply_markup
    )
    return SELECTING_ROLE

# Обработка выбора роли
def select_role(update: Update, context: CallbackContext) -> int:
    query = update.callback_query
    query.answer()

    role = query.data
    user_id = query.from_user.id
    username = query.from_user.username

    if role == "viewer":
        cursor.execute('INSERT OR IGNORE INTO users (user_id, username, role) VALUES (?, ?, ?)', (user_id, username, 'viewer'))
        conn.commit()
        query.edit_message_text(f"🎉 Вы успешно зарегистрировались как зритель!\nВаш никнейм: <b>{username}</b>", parse_mode="HTML")
        return main_menu(update, context)
    elif role == "streamer":
        query.edit_message_text("Введите ваше имя пользователя на Twitch:")
        return STREAMER_CONFIRMATION

# Подтверждение стримера
def confirm_streamer(update: Update, context: CallbackContext) -> int:
    twitch_username = update.message.text
    user_id = update.message.from_user.id
    username = update.message.from_user.username

    client_id = os.getenv("TWITCH_CLIENT_ID")
    client_secret = os.getenv("TWITCH_CLIENT_SECRET")
    oauth_token = get_twitch_oauth_token(client_id, client_secret)

    followers = check_twitch_followers(twitch_username, client_id, oauth_token)

    if followers is None:
        update.message.reply_text("Не удалось найти пользователя на Twitch.")
        return SELECTING_ROLE

    if followers >= 250:
        cursor.execute('INSERT OR IGNORE INTO users (user_id, username, role, twitch_username, followers) VALUES (?, ?, ?, ?, ?)',
                       (user_id, username, 'streamer', twitch_username, followers))
        conn.commit()
        update.message.reply_text(
            f"🎉 Вы успешно зарегистрировались как стример!\n"
            f"Ваш никнейм: <b>{username}</b>\n"
            f"Twitch: <b>{twitch_username}</b>\n"
            f"Подписчиков: <b>{followers}</b>",
            parse_mode="HTML"
        )
        return main_menu(update, context)
    else:
        update.message.reply_text("У вас недостаточно подписчиков на Twitch (минимум 250).")
        return SELECTING_ROLE

# Главное меню
def main_menu(update: Update, context: CallbackContext) -> int:
    keyboard = [
        [InlineKeyboardButton("Найти стримера", callback_data="find_streamer")],
        [InlineKeyboardButton("Оценить фильм", callback_data="rate_movie")],
        [InlineKeyboardButton("Написать рецензию", callback_data="write_review")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    update.callback_query.edit_message_text(
        "<b>Главное меню</b>\n\nЧто вы хотите сделать?",
        parse_mode="HTML",
        reply_markup=reply_markup
    )
    return REGISTERING

# Поиск стримера
def search_streamer(update: Update, context: CallbackContext) -> int:
    update.callback_query.edit_message_text("Введите имя стримера:")
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
    update.callback_query.edit_message_text("Введите название фильма:")
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
    update.callback_query.edit_message_text("Введите название фильма:")
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
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN не найден в переменных окружения.")
        return

    updater = Updater(TELEGRAM_BOT_TOKEN)
    dispatcher = updater.dispatcher

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            SELECTING_ROLE: [CallbackQueryHandler(select_role)],
            STREAMER_CONFIRMATION: [MessageHandler(Filters.text & ~Filters.command, confirm_streamer)],
            REGISTERING: [
                CallbackQueryHandler(search_streamer, pattern="^find_streamer$"),
                CallbackQueryHandler(rate_movie, pattern="^rate_movie$"),
                CallbackQueryHandler(write_review, pattern="^write_review$")
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
