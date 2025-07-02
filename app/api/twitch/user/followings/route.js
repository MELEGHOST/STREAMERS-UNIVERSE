import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTwitchClientWithToken } from '../../../../utils/twitchClient';
import { verifyJwt } from '../../../../utils/jwt';
import { handleAchievementTrigger } from '../../../../utils/achievements';

export async function GET() {
  try {
    const headersList = headers();
    const authorization = headersList.get('authorization');

    if (!authorization) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const supabaseToken = authorization.split(' ')[1];
    
    // Верифицируем JWT, чтобы получить ID пользователя
    const decodedToken = await verifyJwt(supabaseToken);
    if (!decodedToken || !decodedToken.sub) {
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    const userId = decodedToken.sub;

    // Получаем клиент Twitch с токеном пользователя
    const twitchClient = await getTwitchClientWithToken(supabaseToken);
    if (!twitchClient) {
      return NextResponse.json({ message: 'Failed to initialize Twitch client' }, { status: 500 });
    }

    // Получаем каналы, на которые подписан пользователь
    const follows = await twitchClient.channels.getFollowedChannels({ userId, limit: 100 });
    
    // --- Запускаем проверку достижений за подписки ---
    if (follows && follows.data) {
      await handleAchievementTrigger(userId, 'USER_FOLLOWED', { count: follows.data.length });
    }
    // ------------------------------------------------

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
    const errorMessage = error.message || 'Internal Server Error';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
} 