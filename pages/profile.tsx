import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react'; // Обновленный импорт

const Profile = () => {
  const [session, loading] = useSession();
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (session) {
      fetch('/api/twitch/profile')
        .then(response => response.json())
        .then(data => {
          setProfileData(data);
          setLoadingProfile(false);
        })
        .catch(error => {
          console.error('Error fetching profile data:', error);
          setLoadingProfile(false);
        });
    }
  }, [session]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Please sign in to view your profile</div>;
  }

  if (loadingProfile) {
    return <div>Loading profile data...</div>;
  }

  if (!profileData) {
    return <div>Error loading profile data</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Nickname: {profileData.user.display_name}</p>
      <p>Followers:</p>
      <ul>
        {profileData.followers.map(follower => (
          <li key={follower.id}>{follower.name}</li>
        ))}
      </ul>
      <p>Following:</p>
      <ul>
        {profileData.following.map(following => (
          <li key={following.id}>{following.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default Profile;
