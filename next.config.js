module.exports = {
  env: {
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI,
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' https://id.twitch.tv https://api.twitch.tv;",
          },
        ],
      },
    ];
  },
};
