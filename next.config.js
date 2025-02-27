/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["id.twitch.tv", "api.twitch.tv"],
    unoptimized: true
  },
  env: {
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI || "https://streamers-universe.vercel.app/auth",
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN
  },
  experimental: {
    optimizePackageImports: ["react", "react-dom"]
  }
};

module.exports = nextConfig;
</document_content>
