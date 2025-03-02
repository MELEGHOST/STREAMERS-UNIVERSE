import NextAuth from 'next-auth';
import TwitchProvider from 'next-auth/providers/twitch';

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
      callbackUrl: process.env.TWITCH_REDIRECT_URI || 'https://streamers-universe.vercel.app/auth',
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token; // Добавляем refresh_token, если доступен
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + (account.expires_in * 1000); // Учитываем, что expires_at может быть в секундах
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.accessToken) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.expiresAt = token.expiresAt;
      } else {
        console.error('Session callback: Token or accessToken is missing');
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'a-very-secure-random-secret-32chars-long', // Убедимся, что секрет уникален и длинный
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
    origin: process.env.TWITCH_REDIRECT_URI || 'https://streamers-universe.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Разрешаем все методы для тестирования
    credentials: true, // Разрешаем отправку cookies и авторизационных данных
    optionsSuccessStatus: 200 // Устанавливаем статус для OPTIONS-запросов, чтобы избежать проблем с CORS
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
};

export default NextAuth(authOptions);
export { authOptions };
