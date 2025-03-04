import { getSession } from 'next-auth/client';

const getTwitchUserData = async (accessToken) => {
  const response = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-ID': process.env.TWITCH_CLIENT_ID,
    },
  });

  const data = await response.json();
  return data.data[0];
};

const getTwitchFollowers = async (userId, accessToken) => {
  const response = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${userId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-ID': process.env.TWITCH_CLIENT_ID,
    },
  });

  const data = await response.json();
  return data.data;
};

const getTwitchFollowing = async (userId, accessToken) => {
  const response = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${userId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-ID': process.env.TWITCH_CLIENT_ID,
    },
  });

  const data = await response.json();
  return data.data;
};

export default async (req, res) => {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { accessToken } = session;

  try {
    const userData = await getTwitchUserData(accessToken);
    const followersData = await getTwitchFollowers(userData.id, accessToken);
    const followingData = await getTwitchFollowing(userData.id, accessToken);

    const followers = followersData.map(follower => ({
      id: follower.from_id,
      name: follower.from_name,
    }));

    const following = followingData.map(following => ({
      id: following.to_id,
      name: following.to_name,
    }));

    res.status(200).json({
      user: userData,
      followers,
      following,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
