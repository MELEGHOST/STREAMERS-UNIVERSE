import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const accessToken = session.accessToken;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token not found' });
    }

    // Получаем данные пользователя
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const user = userResponse.data.data[0];
    const userId = user.id;
    const twitchName = user.display_name;

    // Получаем фолловеров
    const followersResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const followers = followersResponse.data.data.map(follower => follower.from_name);

    // Получаем фолловингов
    const followingsResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?from_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const followings = followingsResponse.data.data.map(following => following.to_name);

    res.status(200).json({
      twitchName,
      followersCount: followers.length,
      followers,
      followingsCount: followings.length,
      followings,
    });
  } catch (error) {
    console.error('Twitch profile error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
