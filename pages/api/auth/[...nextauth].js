// Исправление файла pages/api/auth/[...nextauth].js

// 1. Исправление дублирования объекта logger
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
      // Убираем callbackUrl из настроек провайдера, т.к. это может вызывать конфликты
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      console.log('JWT callback:', { token, account });
      // Проверяем account только если он существует
      if (account && account.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token; // Добавляем refresh_token, если доступен
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + (account.expires_in * 1000);
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback:', { session, token });
      // Проверяем token только если он существует
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
    // Устанавливаем уровень логов
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
  // Отключаем внутренние логи NextAuth.js, чтобы избежать ошибок 405 для /api/auth/_log
  experimental: {
    disableLogRoutes: true,
  },
};

export default NextAuth(authOptions);
export { authOptions };

// 2. Исправление файла pages/api/auth/twitch.js
// Вместо импорта signIn из next-auth, использовать правильный импорт
// pages/api/auth/twitch.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    console.log('Current session before Twitch sign-in:', session);

    const baseUrl = `${process.env.NEXTAUTH_URL || `https://${req.headers.host}`}`;
    const callbackUrl = '/profile';
    
    // Вместо прямого вызова signIn возвращаем редирект на /api/auth/signin/twitch
    return res.redirect(`/api/auth/signin/twitch?callbackUrl=${encodeURIComponent(`${baseUrl}${callbackUrl}`)}`);
  } catch (error) {
    console.error('Twitch sign-in error:', {
      error,
      stack: error.stack,
      method: req.method,
      url: req.url,
    });
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
}

// 3. Исправление файла pages/api/auth/logout.js
// Удаляем нерабочую часть с req.session.destroy()
import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Очистка cookies через NextAuth.js или вручную
    res.setHeader('Set-Cookie', [
      'next-auth.session-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      'next-auth.callback-url=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      'next-auth.csrf-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      'twitchToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      'twitchUser=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
    ]);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout: ' + error.message });
  }
}
