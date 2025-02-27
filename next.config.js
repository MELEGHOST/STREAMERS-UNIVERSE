// next.config.js
import { withCloudflare } from '@cloudflare/next-on-pages';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI || "https://streamers-universe.pages.dev/auth",
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET
  },
  images: {
    domains: ["id.twitch.tv", "api.twitch.tv"],
    unoptimized: true
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
  experimental: {
    turbo: {},
    optimizePackageImports: ["react", "react-dom"]
  }
};

export default withCloudflare(nextConfig);
