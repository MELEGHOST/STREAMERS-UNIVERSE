// pages/api/auth/twitch/callback.js
const React = require('react');
const axios = require('axios');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TWITCH_REDIRECT_URI, // Используем значение из env
    });

    const token = tokenResponse.data.access_token;
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    const user = userResponse.data.data[0];
    res.status(200).json({ user, token });
  } catch (error) {
    console.error('Twitch callback error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Twitch' });
  }
}

module.exports = handler;
