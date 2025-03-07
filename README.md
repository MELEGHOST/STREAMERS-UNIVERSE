# Streamers Universe

Платформа для стримеров и их зрителей, которая позволяет создавать профили, управлять социальными ссылками и взаимодействовать с сообществом.

## Возможности

- Авторизация через Twitch
- Профили для стримеров (150+ подписчиков) и зрителей
- Управление социальными ссылками (Twitch, YouTube, Discord, Telegram, VK, Яндекс Музыка)
- Просмотр подписчиков и подписок
- Настройки интерфейса (тема, размер шрифта, язык)
- Поиск других пользователей

## Установка и запуск

### Предварительные требования

- Node.js 20.x или выше
- PostgreSQL (для хранения данных)
- Аккаунт разработчика Twitch для получения Client ID и Client Secret

### Шаги установки

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/your-username/streamers-universe.git
   cd streamers-universe
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Создайте файл `.env.local` на основе примера:
   ```
   # Twitch API
   NEXT_PUBLIC_TWITCH_CLIENT_ID=your_twitch_client_id
   TWITCH_CLIENT_SECRET=your_twitch_client_secret
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   NEXT_PUBLIC_TWITCH_REDIRECT_URI=http://localhost:3000/api/twitch/callback

   # Database
   POSTGRES_URL="postgres://username:password@localhost:5432/streamers_universe"
   POSTGRES_PRISMA_URL="postgres://username:password@localhost:5432/streamers_universe?pgbouncer=true&connect_timeout=15"
   POSTGRES_URL_NON_POOLING="postgres://username:password@localhost:5432/streamers_universe"
   POSTGRES_USER="username"
   POSTGRES_HOST="localhost"
   POSTGRES_PASSWORD="password"
   POSTGRES_DATABASE="streamers_universe"
   ```

4. Создайте приложение Twitch:
   - Перейдите на [Twitch Developer Console](https://dev.twitch.tv/console/apps)
   - Создайте новое приложение
   - В качестве OAuth Redirect URL укажите `http://localhost:3000/api/twitch/callback`
   - Скопируйте Client ID и Client Secret в файл `.env.local`

5. Запустите разработческий сервер:
   ```bash
   npm run dev
   ```

6. Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Решение проблем

### Проблема с авторизацией через Twitch

Если вы видите ошибку "Сайт Twitch не позволяет установить соединение", проверьте:

1. Правильно ли указаны Client ID и Client Secret в файле `.env.local`
2. Правильно ли настроен Redirect URI в консоли разработчика Twitch
3. Доступен ли ваш сервер по указанному URL (если вы используете не localhost)

### Проблема с базой данных

Если возникают ошибки при работе с базой данных:

1. Убедитесь, что PostgreSQL запущен и доступен
2. Проверьте правильность учетных данных в файле `.env.local`
3. Убедитесь, что база данных `streamers_universe` создана

## Технологии

- Next.js 15.2.1
- React
- PostgreSQL
- Twitch API

## Лицензия

MIT
