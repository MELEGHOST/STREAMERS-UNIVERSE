const React = require('react');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Twitch auth: Checking environment variables');
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_REDIRECT_URI) {
    console.error('Twitch auth: Missing required environment variables');
    return res.status(500).json({ error: 'Missing Twitch environment variables (TWITCH_CLIENT_ID or TWITCH_REDIRECT_URI)' });
  }

  try {
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(process.env.TWITCH_CLIENT_ID)}&redirect_uri=${encodeURIComponent(process.env.TWITCH_REDIRECT_URI)}&response_type=code&scope=user:read:email+user:read:follows`;
    console.log('Twitch auth: Generated URL:', twitchAuthUrl);
    res.status(200).json({ url: twitchAuthUrl });
  } catch (error) {
    console.error('Twitch auth error:', error);
    res.status(500).json({ error: 'Failed to generate Twitch auth URL: ' + error.message });
  }
}

module.exports = handler;
