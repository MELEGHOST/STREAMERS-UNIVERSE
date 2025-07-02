import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTwitchClientWithToken } from '../../../../utils/twitchClient';
import { verifyJwt } from '../../../../utils/jwt';

export async function GET() {
  try {
    const headersList = headers();
    const authorization = headersList.get('authorization');

    if (!authorization) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const supabaseToken = authorization.split(' ')[1];
    
    const decodedToken = await verifyJwt(supabaseToken);
    if (!decodedToken || !decodedToken.sub) {
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    const userId = decodedToken.sub;

    const twitchClient = await getTwitchClientWithToken(supabaseToken);
    if (!twitchClient) {
      return NextResponse.json({ message: 'Failed to initialize Twitch client' }, { status: 500 });
    }

    const followers = await twitchClient.channels.getChannelFollowers({ broadcasterId: userId, limit: 100 });
    
    const channels = followers.data.map(follow => ({
      id: follow.userId,
      login: follow.userLogin,
      displayName: follow.userDisplayName,
      followedAt: follow.followDate,
    }));
    
    const channelIds = channels.map(c => c.id);
    if (channelIds.length > 0) {
        const users = await twitchClient.users.getUsersByIds(channelIds);
        const usersById = new Map(users.map(u => [u.id, u]));

        channels.forEach(channel => {
            const user = usersById.get(channel.id);
            if (user) {
                channel.profilePictureUrl = user.profilePictureUrl;
            }
        });
    }

    return NextResponse.json(channels);

  } catch (error) {
    console.error('[API /twitch/user/followers] Error:', error);
    const errorMessage = error.message || 'Internal Server Error';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
} 