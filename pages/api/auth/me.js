const React = require('react');
const axios = require('axios');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    console.log('Me API: Fetching user with token:', token);
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!userResponse.data.data || userResponse.data.data.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = userResponse.data.data[0];
    const followersResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    const followersCount = followersResponse.data.total || 0;

    res.status(200).json({
      user: {
        id: user.id,
        name: user.display_name,
        isStreamer: followersCount >= 265,
        followers: followersCount,
      },
      isAuthenticated: true,
    });
  } catch (error) {
    console.error('Me API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch user data: ' + (error.response?.data?.message || error.message) });
  }
}

module.exports = handler;
