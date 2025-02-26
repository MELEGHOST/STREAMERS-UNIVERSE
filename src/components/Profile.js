import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Menu from './Menu';
import Layout from './Layout';

const Profile = () => {
  const { currentUser, isStreamer, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is not authenticated, redirect to auth page
    if (typeof window !== 'undefined' && !currentUser) {
      router.push('/auth');
    }
  }, [currentUser, router]);

  if (!currentUser) return (
    <Layout>
      <div>Please log in to continue</div>
    </Layout>
  );

  return (
    <Layout>
      <Menu />
      <div className="frame profile active">
        <div id="profileHeader">
          <h2 id="profileTitle">{isStreamer ? `Streamer Profile: ${currentUser.name}` : `Subscriber Profile: ${currentUser.name}`}</h2>
          <p id="profileInfo">{isStreamer ? `You have ${currentUser.followers} followers.` : 'You can support streamers.'}</p>
          <button id="switchProfileBtn" onClick={() => router.push('/auth')}>Switch Profile</button>
        </div>
        {isStreamer ? (
          <div id="streamerSection" className="profile-content active">
            <button id="addSchedule">Add Stream</button>
            <button id="addMovie">Add Movie</button>
            <button id="addGame">Add Game</button>
            <button id="addSocial">Add Social Network</button>
            <button id="addReview">Add Review</button>
            <button id="donateBtn">Set Up Donations</button>
            <button id="requestCollabBtn">Configure Collab Requests</button>
            <h3>Stream Schedule</h3>
            <div id="scheduleList"></div>
            <h3>Watched Movies</h3>
            <div id="movieList"></div>
            <h3>Games</h3>
            <div id="gameList"></div>
            <h3>Social Networks</h3>
            <div id="socialLinks"></div>
            <h3>Reviews and Tier Lists</h3>
            <div id="reviewList"></div>
          </div>
        ) : (
          <div id="viewerSection" className="profile-content active">
            <button id="viewSchedule">View Schedule</button>
            <button id="viewMovies">View Movies</button>
            <button id="viewGames">View Games</button>
            <button id="viewSocials">View Social Networks</button>
            <button id="askQuestionBtn">Ask a Question</button>
            <button id="voteScheduleBtn">Vote for Stream</button>
            <button id="donate">Support Streamer</button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
