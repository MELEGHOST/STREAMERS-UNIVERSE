// generateConfig.js
export default function handler(req) {
  return new Response(
    `window.config = { TWITCH_CLIENT_ID: "${process.env.TWITCH_CLIENT_ID}", TWITCH_REDIRECT_URI: "${process.env.TWITCH_REDIRECT_URI}" };`,
    {
      headers: {
        "Content-Type": "application/javascript",
      },
    }
  );
}
