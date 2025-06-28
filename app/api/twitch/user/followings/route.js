import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTwitchClientWithToken } from '../../../utils/twitchClient';
import { verifyJwt } from '../../../utils/jwt';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabaseToken = cookieStore.get('supabase-auth-token');

    if (!supabaseToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Верифицируем JWT, чтобы получить ID пользователя
    const decodedToken = await verifyJwt(supabaseToken.value);
    if (!decodedToken || !decodedToken.sub) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const userId = decodedToken.sub;

    // Получаем клиент Twitch с токеном пользователя
    const twitchClient = await getTwitchClientWithToken(supabaseToken.value);
    if (!twitchClient) {
      return NextResponse.json({ error: 'Failed to initialize Twitch client' }, { status: 500 });
    }

    // Получаем каналы, на которые подписан пользователь
    const follows = await twitchClient.channels.getFollowedChannels({ userId, limit: 100 });
    
    // Форматируем данные для фронтенда
    const channels = follows.data.map(follow => ({
      id: follow.broadcasterId,
      login: follow.broadcasterName,
      displayName: follow.broadcasterDisplayName,
      followedAt: follow.followedAt,
    }));
    
    // Дополнительно получаем информацию о каналах (аватары, онлайн-статус)
    const channelIds = channels.map(c => c.id);
    if (channelIds.length > 0) {
        const users = await twitchClient.users.getUsersByIds(channelIds);
        const streams = await twitchClient.streams.getStreamsByUserIds(channelIds);

        const usersById = new Map(users.map(u => [u.id, u]));
        const streamsById = new Map(streams.map(s => [s.userId, s]));

        channels.forEach(channel => {
            const user = usersById.get(channel.id);
            const stream = streamsById.get(channel.id);
            if (user) {
                channel.profilePictureUrl = user.profilePictureUrl;
            }
            if (stream) {
                channel.isLive = true;
                channel.title = stream.title;
                channel.gameName = stream.gameName;
            } else {
                channel.isLive = false;
            }
        });
    }

    return NextResponse.json(channels);

  } catch (error) {
    console.error('[API /twitch/user/followings] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 