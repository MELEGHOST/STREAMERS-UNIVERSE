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

## Настройка безопасного хранения данных

В проекте реализовано безопасное кроссплатформенное хранение данных пользователей, которое работает в web, desktop и мобильных Telegram приложениях.

### Необходимые переменные окружения в Vercel

Для корректной работы системы хранения данных, необходимо установить следующие переменные окружения в Vercel:

```
JWT_SECRET=ваш_сложный_секретный_ключ
```

Важно: не сохраняйте этот секрет в репозитории! Используйте только панель управления Vercel для установки этого значения.

### Инициализация базы данных

Для создания необходимых таблиц используйте SQL-скрипт из `migrations/user_data.sql`.

### Использование в коде

```javascript
// Импорт класса DataStorage
import { DataStorage } from '../app/utils/dataStorage';

// Сохранение данных
await DataStorage.saveData('followers', {
  data: followersData,
  timestamp: Date.now()
});

// Получение данных
const followers = await DataStorage.getData('followers');

// Проверка авторизации
if (DataStorage.isAuthenticated()) {
  // Пользователь авторизован
}

// Очистка данных при выходе из системы
await DataStorage.clearAllData();

// Экспорт данных (для бэкапа)
const allUserData = await DataStorage.exportAllData();
```

Система автоматически:
1. Пытается сохранить данные на сервере
2. Дублирует их в куки
3. При чтении сначала пытается получить с сервера, затем из куков
4. Обрабатывает ошибки сети и недоступность сервера

Это обеспечивает одинаковое поведение во всех браузерах, на десктопе и в Telegram WebApp.

### Настройка JWT (JSON Web Tokens)

JWT токены используются для безопасной аутентификации пользователей при доступе к данным. 
Система автоматически создает JWT токен при авторизации пользователя через Twitch и использует его для доступа к API.

### Миграция с localStorage

Система автоматически мигрирует данные из старого хранилища (localStorage, cookies) в новую систему хранения при первом обращении.

### Отладка

Если у вас возникают проблемы с хранением данных, вы можете включить режим отладки:

```javascript
// В файле .env.local для локальной разработки
DEBUG_STORAGE=true
```

Это включит подробное логирование всех операций с хранилищем данных.
