const React = require('react');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userData = await userResponse.json();
    const user = userData.data[0];
    const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    const followersData = await followersResponse.json();
    const followersCount = followersData.total || 0;

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
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = handler;
