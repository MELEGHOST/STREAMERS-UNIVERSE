const React = require('react');
const axios = require('axios');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  try {
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TWITCH_REDIRECT_URI,
    });

    const token = tokenResponse.data.access_token;
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    const user = userResponse.data.data[0];
    const followersResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    const followersCount = followersResponse.data.total || 0;
    let userData = {
      id: user.id,
      name: user.display_name,
      isStreamer: followersCount >= 265,
      followers: followersCount,
      subscriptions: [],
    };

    if (!userData.isStreamer) {
      const subsResponse = await axios.get(`https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${user.id}`, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      });
      userData.subscriptions = (subsResponse.data.data || []).map(sub => sub.broadcaster_name);
    }

    res.status(200).json({ user: userData, token });
  } catch (error) {
    console.error('Twitch callback error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Twitch' });
  }
}

module.exports = handler;
