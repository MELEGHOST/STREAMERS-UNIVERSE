import NextAuth from 'next-auth';
import TwitchProvider from 'next-auth/providers/twitch';

// Проверка переменных окружения
const requiredEnvVars = {
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables for NextAuth.js:', missingEnvVars);
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const authOptions = {
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      authorization: {
        url: 'https://id.twitch.tv/oauth2/authorize',
        params: { scope: 'user:read:email openid' },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },
  pages: {
    signIn: '/auth',
    error: '/auth',
  },
  callbacks: {
    async jwt({ token, account }) {
      console.log('JWT callback:', { token, account });
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at 
          ? account.expires_at * 1000 
          : account.expires_in 
            ? Date.now() + (account.expires_in * 1000)
            : Date.now() + (3600 * 1000); // 1 час по умолчанию
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
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
export const authOptions as const = authOptions; // Именованный экспорт для использования
