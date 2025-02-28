export default {
  reactStrictMode: true,
  output: "standalone",
  env: {
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI || "https://streamers-universe.vercel.app/auth",
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET
  },
  images: {
    domains: ["id.twitch.tv", "api.twitch.tv"],
    unoptimized: true
  },
  experimental: {
    esmExternals: true // Включаем поддержку ES-модулей для внешних зависимостей
  }
};
