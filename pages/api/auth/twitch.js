const React = require('react');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Twitch auth: TWITCH_REDIRECT_URI:', process.env.TWITCH_REDIRECT_URI, 'TWITCH_CLIENT_ID:', process.env.TWITCH_CLIENT_ID);
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_REDIRECT_URI) {
    return res.status(500).json({ error: 'Missing Twitch environment variables' });
  }

  try {
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${process.env.TWITCH_REDIRECT_URI}&response_type=code&scope=user:read:email+user:read:follows`;
    console.log('Twitch auth: Generated URL:', twitchAuthUrl);
    res.status(200).json({ url: twitchAuthUrl });
  } catch (error) {
    console.error('Twitch auth error:', error);
    res.status(500).json({ error: 'Failed to generate Twitch auth URL' });
  }
}

module.exports = handler;
