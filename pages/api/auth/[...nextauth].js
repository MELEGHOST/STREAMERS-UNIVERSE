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
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      console.log('JWT callback:', { token, account });
      if (account && account.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token; // Добавляем refresh_token, если доступен
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + (account.expires_in * 1000);
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback:', { session, token });
      if (token) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.expiresAt = token.expiresAt;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
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
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
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
  useSecureCookies: process.env.NODE_ENV === 'production',
  jwt: {
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  },
  experimental: {
    disableLogRoutes: true,
  },
};

export default NextAuth(authOptions);
// Убрали отдельный export { authOptions }, так как он дублирует экспорт и вызывает конфликт
