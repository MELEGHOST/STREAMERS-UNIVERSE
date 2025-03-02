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
      callbackUrl: process.env.TWITCH_REDIRECT_URI || 'https://streamers-universe.vercel.app/auth', // Обновлено на /auth
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token; // Добавляем refresh_token, если доступен
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken; // Добавляем refresh_token в сессию
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'a-very-secure-random-secret-32chars-long',
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
  allowDangerousEmailAccountLinking: true,
};

export default NextAuth(authOptions);
export { authOptions };
