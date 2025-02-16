import logging
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Updater, CommandHandler, CallbackContext
from flask import Flask, jsonify, request
import sqlite3
import threading
from waitress import serve

# Настройка логирования
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Команда /start
def start(update: Update, context: CallbackContext) -> None:
    keyboard = [
        [InlineKeyboardButton("Открыть мини-приложение", web_app=WebAppInfo(url="https://your-replit-url.repl.co"))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    update.message.reply_text(
        "<b>Добро пожаловать!</b>\n\n"
        "Нажмите кнопку ниже, чтобы открыть мини-приложение.",
        parse_mode="HTML",
        reply_markup=reply_markup
    )

# Flask-сервер для мини-приложения
app = Flask(__name__)

@app.route('/')
def home():
    return "Welcome to the Streamers Universe Mini App!"

@app.route('/get-streamers', methods=['GET'])
def get_streamers():
    cursor.execute('SELECT username, twitch_username, followers FROM users WHERE role = ?', ('streamer',))
    streamers = cursor.fetchall()
    return jsonify([{'username': s[0], 'twitch_username': s[1], 'followers': s[2]} for s in streamers])

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    user_id = data.get('user_id')
    username = data.get('username')
    role = data.get('role')
    twitch_username = data.get('twitch_username')
    followers = data.get('followers')

    cursor.execute('INSERT OR IGNORE INTO users (user_id, username, role, twitch_username, followers) VALUES (?, ?, ?, ?, ?)',
                   (user_id, username, role, twitch_username, followers))
    conn.commit()

    return jsonify({"status": "ok", "message": f"Вы успешно зарегистрировались как {role}!"})

@app.route('/rate-movie', methods=['POST'])
def rate_movie():
    data = request.json
    movie_title = data.get('movie_title')
    score = data.get('score')
    user_id = data.get('user_id')

    cursor.execute('SELECT movie_id FROM movies WHERE title = ?', (movie_title,))
    movie = cursor.fetchone()

    if movie:
        movie_id = movie[0]
        cursor.execute('INSERT INTO ratings (movie_id, user_id, score) VALUES (?, ?, ?)', (movie_id, user_id, score))
        conn.commit()
        return jsonify({"status": "ok", "message": f"Вы оценили фильм '{movie_title}' на {score} из 10."})
    else:
        return jsonify({"status": "error", "message": "Фильм не найден."})

@app.route('/write-review', methods=['POST'])
def write_review():
    data = request.json
    movie_title = data.get('movie_title')
    review = data.get('review')
    user_id = data.get('user_id')

    cursor.execute('SELECT movie_id FROM movies WHERE title = ?', (movie_title,))
    movie = cursor.fetchone()

    if movie:
        movie_id = movie[0]
        cursor.execute('INSERT INTO ratings (movie_id, user_id, review) VALUES (?, ?, ?)', (movie_id, user_id, review))
        conn.commit()
        return jsonify({"status": "ok", "message": f"Ваша рецензия на фильм '{movie_title}' сохранена."})
    else:
        return jsonify({"status": "error", "message": "Фильм не найден."})

# Запуск Flask-сервера через Waitress
def run_flask():
    serve(app, host='0.0.0.0', port=8080)

# Основная функция
def main() -> None:
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN не найден в переменных окружения.")
        return

    # Запуск Flask-сервера в отдельном потоке
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.daemon = True
    flask_thread.start()

    updater = Updater(TELEGRAM_BOT_TOKEN)
    dispatcher = updater.dispatcher

    dispatcher.add_handler(CommandHandler('start', start))

    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()
