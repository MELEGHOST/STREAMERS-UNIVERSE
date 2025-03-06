import axios from 'axios';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Proper cookie parsing in API routes
    const cookies = parse(req.headers.cookie || '');
    const accessToken = cookies.twitch_access_token;

    console.log('Profile API - accessToken:', accessToken ? 'present' : 'missing');

    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user data
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const user = userResponse.data.data[0];
    const userId = user.id;
    const twitchName = user.display_name;

    // Get followers - adding pagination support for large accounts
    let followers = [];
    let cursor = null;
    let hasMoreFollowers = true;

    while (hasMoreFollowers) {
      const url = cursor
        ? `https://api.twitch.tv/helix/users/follows?to_id=${userId}&after=${cursor}`
        : `https://api.twitch.tv/helix/users/follows?to_id=${userId}`;

      const followersResponse = await axios.get(url, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      followers = [...followers, ...followersResponse.data.data.map((f) => f.from_name)];

      if (followersResponse.data.pagination && followersResponse.data.pagination.cursor) {
        cursor = followersResponse.data.pagination.cursor;
      } else {
        hasMoreFollowers = false;
      }

      // Limit to first 100 for performance
      if (followers.length >= 100) {
        hasMoreFollowers = false;
      }
    }

    // Get following - adding pagination support
    let followings = [];
    cursor = null;
    let hasMoreFollowings = true;

    while (hasMoreFollowings) {
      const url = cursor
        ? `https://api.twitch.tv/helix/users/follows?from_id=${userId}&after=${cursor}`
        : `https://api.twitch.tv/helix/users/follows?from_id=${userId}`;

      const followingsResponse = await axios.get(url, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      followings = [...followings, ...followingsResponse.data.data.map((f) => f.to_name)];

      if (followingsResponse.data.pagination && followingsResponse.data.pagination.cursor) {
        cursor = followingsResponse.data.pagination.cursor;
      } else {
        hasMoreFollowings = false;
      }

      // Limit to first 100 for performance
      if (followings.length >= 100) {
        hasMoreFollowings = false;
      }
    }

    res.status(200).json({
      twitchName,
      followersCount: followers.length,
      followers,
      followingsCount: followings.length,
      followings,
    });
  } catch (error) {
    console.error('Twitch profile error:', error);
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
