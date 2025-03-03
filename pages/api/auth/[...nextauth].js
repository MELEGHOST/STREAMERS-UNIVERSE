import NextAuth from 'next-auth';
import TwitchProvider from 'next-auth/providers/twitch';

// Проверка наличия обязательных переменных окружения
if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET || !process.env.NEXTAUTH_SECRET || !process.env.TWITCH_REDIRECT_URI) {
  console.error('Missing required environment variables for NextAuth.js:', {
    TWITCH_CLIENT_ID: !!process.env.TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET: !!process.env.TWITCH_CLIENT_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    TWITCH_REDIRECT_URI: !!process.env.TWITCH_REDIRECT_URI,
  });
  throw new Error('Missing required environment variables for NextAuth.js');
}

// Определяем объект authOptions для экспорта
const authOptions = {
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      authorization: {
        url: 'https://id.twitch.tv/oauth2/authorize',
        params: { scope: 'user:read:email' },
      },
      callbackUrl: process.env.TWITCH_REDIRECT_URI || 'https://streamers-universe-adat68ofj-meleghosts-projects.vercel.app/auth',
    }),
  ],
  callbacks: {
    async jwt({ token, account, req }) {
      console.log('JWT callback:', { token, account, req });
      if (!account || !account.access_token) {
        console.error('JWT callback: No access token available', { account, req });
        throw new Error('No access token available in JWT callback');
      }
      // Дополнительная проверка на наличие secret
      if (!process.env.NEXTAUTH_SECRET) {
        console.error('JWT callback: NEXTAUTH_SECRET is missing');
        throw new Error('NEXTAUTH_SECRET is required');
      }
      token.accessToken = account.access_token;
      token.refreshToken = account.refresh_token; // Добавляем refresh_token, если доступен
      token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + (account.expires_in * 1000); // Учитываем, что expires_at может быть в секундах
      return token;
    },
    async session({ session, token, req }) {
      console.log('Session callback:', { session, token, req });
      if (!token || !token.accessToken) {
        console.error('Session callback: Token or accessToken is missing', { token, req });
        return {
          error: 'Invalid session token',
          expires: new Date(Date.now() + 60 * 1000).toISOString(), // Устанавливаем короткий срок действия для немедленного обновления
        };
      }
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.expiresAt = token.expiresAt;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // Убедимся, что секрет указан явно
  pages: {
    signIn: '/auth',
    error: '/auth',
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', { code, metadata });
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
    debug(code, metadata) {
      console.debug('NextAuth Debug:', { code, metadata });
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log('Sign in event:', { user, account, profile });
    },
    async signOut({ token }) {
      console.log('Sign out event:', { token });
    },
    async error({ error, message }) {
      console.error('NextAuth Error Event:', { error, message });
    },
  },
  allowDangerousEmailAccountLinking: true, // Для тестов (убрать в продакшене)
  useSecureCookies: process.env.NODE_ENV === 'production', // Используем secure cookies только в продакшене
  jwt: {
    maxAge: 60 * 60 * 24 * 30, // 30 дней
    secret: process.env.NEXTAUTH_SECRET, // Указываем тот же секрет для JWT
  },
  cors: {
    origin: process.env.TWITCH_REDIRECT_URI || 'https://streamers-universe-adat68ofj-meleghosts-projects.vercel.app',
    methods: ['GET', 'POST', 'OPTIONS'], // Убедимся, что поддерживаются все необходимые методы для CORS
    credentials: true, // Разрешаем отправку cookies и авторизационных данных
    optionsSuccessStatus: 200, // Устанавливаем статус для OPTIONS-запросов, чтобы избежать проблем с CORS
    exposedHeaders: ['Set-Cookie'], // Разрешаем передачу заголовков Set-Cookie для cookies
  },
  session: {
    strategy: 'jwt', // Используем JWT для сессий
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  },
  // Добавляем настройки для стабильной работы логов и предотвращения ошибок 405
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  },
  // Добавляем адаптер для стабильности (null, если не используется база данных)
  adapter: null, // Отключаем адаптер, если не используется база данных
  // Отключаем внутренние логи NextAuth.js, чтобы избежать ошибок 405 для /api/auth/_log
  experimental: {
    disableLogRoutes: true,
  },
  // Добавляем кастомный обработчик ошибок для предотвращения возврата HTML
  error: {
    async handler(error, req, res) {
      console.error('Custom NextAuth Error Handler:', { error, req, res });
      res.status(500).json({ error: 'Internal Server Error', message: error.message || 'An error occurred' });
    },
  },
};

export default NextAuth(authOptions);
export { authOptions };
