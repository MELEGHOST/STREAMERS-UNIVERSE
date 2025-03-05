export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.host}`;
  const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(baseUrl + '/api/twitch/callback')}&response_type=code&scope=user:read:email`;
  res.redirect(302, twitchAuthUrl);
}
