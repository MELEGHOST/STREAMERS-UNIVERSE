import NextAuth from 'next-auth';
import TwitchProvider from 'next-auth/providers/twitch';

export default NextAuth({
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      redirectUri: process.env.TWITCH_REDIRECT_URI, // Добавляем TWITCH_REDIRECT_URI
      authorization: {
        params: {
          scope: 'user:read:email user:read:follows', // Расширяем скоуп для большего функционала
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      try {
        if (account) {
          token.accessToken = account.access_token;
        }
        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token; // Возвращаем токен, даже если ошибка
      }
    },
    async session({ session, token }) {
      try {
        session.accessToken = token.accessToken;
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session; // Возвращаем сессию, даже если ошибка
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // Убедимся, что secret задан
});
