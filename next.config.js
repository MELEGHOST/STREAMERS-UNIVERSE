// Импортируем адаптер Cloudflare для Next.js
const { withCloudflare } = require('@cloudflare/next-on-pages');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Включаем строгий режим для React 19
  reactStrictMode: true,
  swcMinify: true, // Оптимизация сборки
  output: 'standalone', // Оптимизация для статического экспорта, совместимого с Cloudflare Pages

  // Настройки для авторизации через Twitch
  env: {
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI || 'https://streamers-universe.pages.dev/auth',
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
  },

  // Настройки для безопасности и производительности
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' https://id.twitch.tv https://api.twitch.tv;",
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
      ],
    },
  ],

  // Настройки для минимизации и производительности
  images: {
    domains: ['id.twitch.tv', 'api.twitch.tv'], // Разрешаем загрузку изображений с Twitch
    unoptimized: true, // Отключаем оптимизацию изображений для Cloudflare Pages (можно включить позже)
  },

  // Настройки для совместимости с Cloudflare Pages и Next.js 15
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, // Отключаем fs для Cloudflare (нет доступа к файловой системе)
      net: false,
      tls: false,
    };
    return config;
  },

  // Оптимизация под серверные функции Cloudflare Pages и новые возможности Next.js 15
  experimental: {
    serverComponentsExternalPackages: ['@cloudflare/next-on-pages'], // Исключаем адаптер из серверных компонентов
    turbo: true, // Включаем Turbopack для ускорения сборки
    optimizePackageImports: ['react', 'react-dom'], // Оптимизация импорта React для производительности
  },
};

// Экспортируем конфигурацию с адаптером Cloudflare
module.exports = withCloudflare(nextConfig);
