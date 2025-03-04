export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const state = Math.random().toString(36).substring(2); // CSRF protection
    const redirectUri = `${process.env.NEXTAUTH_URL || `https://${req.headers.host}`}/api/auth/twitch/callback`;
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=user:read:email user:read:follows&state=${state}`;
    res.redirect(twitchAuthUrl);
  } catch (error) {
    console.error('Twitch login error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
