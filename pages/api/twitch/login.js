export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Use consistent base URL with next.config.js
  const baseUrl = process.env.TWITCH_REDIRECT_URI 
    ? process.env.TWITCH_REDIRECT_URI.split('/api/twitch/callback')[0] 
    : 'https://streamers-universe.vercel.app';
    
  const redirectUri = `${baseUrl}/api/twitch/callback`;
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
