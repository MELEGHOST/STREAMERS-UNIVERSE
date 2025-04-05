/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  compiler: {
    styledComponents: true, // Включаем поддержку styled-components
  },
  // Добавляем настройки для статически генерируемых страниц
  staticPageGenerationTimeout: 180, // 3 минуты
  // Исключаем страницы из статической генерации
  excludeDefaultMomentLocales: true,
  env: {
    // Явно указываем переменные окружения, которые должны быть доступны на клиенте и сервере
    NEXT_PUBLIC_TWITCH_CLIENT_ID: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_TWITCH_REDIRECT_URI: process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI,
  },
  images: {
    domains: ['id.twitch.tv', 'api.twitch.tv', 'static-cdn.jtvnw.net'],
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    
    // Добавляем алиасы для импортов
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
      '@/lib': `${__dirname}/lib`,
      '@/app': `${__dirname}/app`,
    };
    
    return config;
  },
  // Добавляем настройки для куков
  serverRuntimeConfig: {
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
    // Добавляем серверные переменные окружения
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
  },
};

module.exports = nextConfig;
