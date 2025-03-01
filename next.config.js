export default {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI || 'https://streamers-universe.vercel.app/auth',
  },
  images: {
    domains: ['id.twitch.tv', 'api.twitch.tv'],
    unoptimized: true,
  },
  experimental: {
    esmExternals: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};
