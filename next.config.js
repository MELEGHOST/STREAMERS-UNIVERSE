/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",

  env: {
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI || "https://streamers-universe.pages.dev/auth",
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET
  },

  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' https://id.twitch.tv https://api.twitch.tv;" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" }
      ]
    }
  ],

  images: {
    domains: ["id.twitch.tv", "api.twitch.tv"],
    unoptimized: true
  },

  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },

  experimental: {
    turbo: true,
    optimizePackageImports: ["react", "react-dom"]
  }
};

module.exports = nextConfig;
