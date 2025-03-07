import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Получаем параметры запроса
    const url = new URL(request.url);
    const login = url.searchParams.get('login');
    
    if (!login) {
      return NextResponse.json({ error: 'Missing login parameter' }, { status: 400 });
    }
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
      return NextResponse.json({ error: 'User not found on Twitch' }, { status: 404 });
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
    
    return NextResponse.json({
      twitchData: twitchUser,
      isRegistered: false, // This would need to check your database
      followers: followerData.total,
      commonStreamers: [], // This would need additional logic to implement
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
} 