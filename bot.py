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

# Остальной код...

# Flask-сервер для мини-приложения
app = Flask(__name__)

@app.route('/get-streamers', methods=['GET'])
def get_streamers():
    cursor.execute('SELECT username, twitch_username, followers FROM users WHERE role = ?', ('streamer',))
    streamers = cursor.fetchall()
    return jsonify([{'username': s[0], 'twitch_username': s[1], 'followers': s[2]} for s in streamers])

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
    app.run(host='0.0.0.0', port=8080)

if __name__ == '__main__':
    main()