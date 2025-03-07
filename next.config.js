/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    // Не устанавливаем жестко TWITCH_REDIRECT_URI, будем определять его динамически
    // в зависимости от окружения (Production или Preview)
  },
  images: {
    domains: ['id.twitch.tv', 'api.twitch.tv', 'static-cdn.jtvnw.net'],
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
  // Add public runtimes for client-side code
  publicRuntimeConfig: {
    NEXT_PUBLIC_TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  },
  // Добавляем настройки для куков
  serverRuntimeConfig: {
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
  },
  // Добавляем настройки для CORS
  async headers() {
    return [
      {
        // Применяем эти заголовки ко всем маршрутам
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
