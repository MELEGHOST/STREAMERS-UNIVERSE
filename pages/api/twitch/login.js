export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Use the exact redirect URI from environment variables to ensure consistency
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  
  if (!redirectUri) {
    return res.status(500).json({ error: 'Missing TWITCH_REDIRECT_URI environment variable' });
  }
  
  const state = Math.random().toString(36).substring(2); // Random state
  
  const scopes = 'user:read:email user:read:follows';
  const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
    process.env.TWITCH_CLIENT_ID
  }&redirect_uri=${
    encodeURIComponent(redirectUri)
  }&response_type=code&scope=${
    encodeURIComponent(scopes)
  }&state=${state}`;
  
  res.redirect(302, twitchAuthUrl);
}
