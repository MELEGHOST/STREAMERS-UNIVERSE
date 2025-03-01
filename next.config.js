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
    // Поддержка styled-components через babel-loader
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['next/babel'],
          plugins: ['babel-plugin-styled-components'],
        },
      },
    });
    return config;
  },
};
