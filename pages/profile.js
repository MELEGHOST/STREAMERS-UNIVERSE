const React = require('react');
const { useAuth } = require('../src/context/AuthContext');
const styled = require('styled-components').default;

const ProfileContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 20px auto;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1em;
  cursor: pointer;
  margin: 5px;

  &:hover {
    background-color: #2980b9;
  }
`;

function Profile() {
  const { currentUser, isAuthenticated, isStreamer, logout, switchProfile, profiles, stars, earnStars, spendStars } = useAuth();
  const [question, setQuestion] = React.useState('');
  const [questionPrice, setQuestionPrice] = React.useState(10); // Цена вопроса в Stars
  const [streamSchedule, setStreamSchedule] = React.useState([]);
  const [selectedDate, setSelectedDate] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [allowedStreamers, setAllowedStreamers] = React.useState([]);
  const [moderators, setModerators] = React.useState([]);
  const [trustedFollowers, setTrustedFollowers] = React.useState([]);
  const [rating, setRating] = React.useState(0);
  const [streamerRating, setStreamerRating] = React.useState(0);

  if (!isAuthenticated || !currentUser) {
    return React.createElement('div', null, 'Please log in');
  }

  const handleAddStream = () => {
    if (selectedDate && description) {
      setStreamSchedule([...streamSchedule, { date: selectedDate, description }]);
      setSelectedDate('');
      setDescription('');
    }
  };

  const handleVote = (date, vote) => {
    console.log(`Vote for ${date}: ${vote}`);
  };

  const handleRateStreamer = (value) => {
    setRating(value);
    console.log(`Rated streamer: ${value}`);
    if (value >= 4) unlockFeature('Exclusive Badge');
  };

  const unlockFeature = (feature) => {
    console.log(`Unlocked feature: ${feature}`);
  };

  const handleAskQuestion = () => {
    if (spendStars(questionPrice)) {
      console.log(`Question asked: ${question} for ${questionPrice} Stars`);
      setQuestion('');
    } else {
      alert('Not enough Stars!');
    }
  };

  const handleEarnStars = () => {
    earnStars(5); // Заработать 5 Stars за рекламу
    alert('Earned 5 Stars from ad!');
  };

  const handleCollaborationRequest = (streamerId) => {
    if (allowedStreamers.includes(streamerId)) {
      console.log(`Collaboration request sent to ${streamerId}`);
    } else {
      alert('This streamer is not allowed to collaborate.');
    }
  };

  return React.createElement(
    ProfileContainer,
    null,
    [
      React.createElement('h1', null, `Profile: ${currentUser.name}`),
      React.createElement('p', null, `Followers: ${currentUser.followers || 0}`),
      React.createElement('p', null, `Role: ${isStreamer ? 'Streamer' : 'Follower'}`),
      React.createElement('p', null, `Stars: ${stars} ⭐`),
      isStreamer && [
        React.createElement(Section, null, [
          React.createElement('h2', null, 'Stream Schedule'),
          React.createElement('input', { type: 'date', value: selectedDate, onChange: (e) => setSelectedDate(e.target.value) }),
          React.createElement('input', { type: 'text', value: description, onChange: (e) => setDescription(e.target.value), placeholder: 'Stream description' }),
          React.createElement(Button, { onClick: handleAddStream }, 'Add Stream'),
          streamSchedule.map((item, index) => React.createElement('div', { key: index }, `${item.date}: ${item.description}`)),
          React.createElement('h3', null, 'Viewer Voting'),
          streamSchedule.map((item, index) => React.createElement('div', { key: `vote-${index}` }, [
            React.createElement('p', null, item.date),
            React.createElement(Button, { onClick: () => handleVote(item.date, 'Yes') }, 'Vote Yes'),
            React.createElement(Button, { onClick: () => handleVote(item.date, 'No') }, 'Vote No')
          ])),
          React.createElement('h3', null, 'Collaborations'),
          React.createElement('input', { type: 'text', placeholder: 'Streamer ID for collab', onChange: (e) => setAllowedStreamers([...allowedStreamers, e.target.value]) }),
          React.createElement(Button, { onClick: () => handleCollaborationRequest('streamer-id') }, 'Request Collaboration'),
          React.createElement('h3', null, 'Moderators & Trusted Followers'),
          React.createElement('input', { type: 'text', placeholder: 'Moderator ID', onChange: (e) => setModerators([...moderators, e.target.value]) }),
          React.createElement('input', { type: 'text', placeholder: 'Trusted Follower ID', onChange: (e) => setTrustedFollowers([...trustedFollowers, e.target.value]) })
        ]),
      ],
      !isStreamer && currentUser.followers < 265 && [
        React.createElement(Section, null, [
          React.createElement('h2', null, 'Become a Streamer'),
          React.createElement('p', null, `Followers needed: ${265 - currentUser.followers}`),
          React.createElement('p', null, 'Tips: Engage with your audience, stream regularly, use social media.'),
          React.createElement('p', null, 'Achievements: 50 followers – Basic Badge, 100 followers – Silver Badge')
        ]),
      ],
      React.createElement(Section, null, [
        React.createElement('h3', null, 'Rate Streamer'),
        [1, 2, 3, 4, 5].map((star) => React.createElement(Button, { key: star, onClick: () => handleRateStreamer(star) }, `⭐${star}`)),
        React.createElement('p', null, `Your rating: ${rating}, Streamer rating: ${streamerRating}`)
      ]),
      React.createElement(Section, null, [
        React.createElement('h3', null, 'Ask a Question'),
        React.createElement('input', { type: 'text', value: question, onChange: (e) => setQuestion(e.target.value), placeholder: 'Your question' }),
        React.createElement('input', { type: 'number', value: questionPrice, onChange: (e) => setQuestionPrice(parseInt(e.target.value) || 10), min: 1, placeholder: 'Stars' }),
        React.createElement(Button, { onClick: handleAskQuestion }, 'Ask'),
        React.createElement(Button, { onClick: handleEarnStars }, 'Earn Stars (Watch Ad)')
      ]),
      React.createElement(Button, { onClick: () => window.history.back() }, 'Back'),
      React.createElement(Button, { onClick: logout }, 'Logout')
    ]
  );
}

module.exports = Profile;
