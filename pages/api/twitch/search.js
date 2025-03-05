import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { login } = req.query;
  
  if (!login) {
    return res.status(400).json({ error: 'Missing login parameter' });
  }
  
  try {
    // Proper cookie parsing in API routes
    const cookies = parse(req.headers.cookie || '');
    const accessToken = cookies.twitch_access_token;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Call Twitch API to get user data
    const twitchResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, 
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!twitchResponse.ok) {
      throw new Error(`Twitch API error: ${twitchResponse.status}`);
    }
    
    const twitchData = await twitchResponse.json();
    const twitchUser = twitchData.data[0];
    
    if (!twitchUser) {
      return res.status(404).json({ error: 'User not found on Twitch' });
    }

    // Get follower count
    const followerResponse = await fetch(
      `https://api.twitch.tv/helix/users/follows?to_id=${twitchUser.id}`, 
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!followerResponse.ok) {
      throw new Error(`Follower count error: ${followerResponse.status}`);
    }
    
    const followerData = await followerResponse.json();
    
    return res.status(200).json({
      twitchData: twitchUser,
      isRegistered: false, // This would need to check your database
      followers: followerData.total,
      commonStreamers: [], // This would need additional logic to implement
    });
  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
}
