/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  compiler: {
    styledComponents: true, // Включаем поддержку styled-components
  },
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
  // Настройки Content Security Policy
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https: blob:;
              font-src 'self' data:;
              connect-src 'self' https://api.twitch.tv https://id.twitch.tv https://www.twitch.tv https://*.twitch.tv;
              frame-src 'self' https://id.twitch.tv https://www.twitch.tv;
              form-action 'self' https://id.twitch.tv https://www.twitch.tv;
            `.replace(/\s+/g, ' ').trim()
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization'
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;
