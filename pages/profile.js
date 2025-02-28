const React = require('react');
const { useAuth } = require('../src/context/AuthContext');

function Profile() {
  const { currentUser, isAuthenticated, isStreamer, logout, switchProfile, profiles, stars, earnStars, spendStars } = useAuth();
  const [question, setQuestion] = React.useState('');
  const [questionPrice, setQuestionPrice] = React.useState(10); // Цена вопроса в Stars
  const [streamSchedule, setStreamSchedule] = React.useState([]);
  const [selectedDate, setSelectedDate] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [allowedStreamers, setAllowedStreamers] = React.createState([]); // Список стримеров для коллабов
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
    // Логика голосования за время стримов
    console.log(`Vote for ${date}: ${vote}`);
  };

  const handleRateStreamer = (value) => {
    setRating(value);
    // Отправка рейтинга на сервер/обновление топа
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
    // Пример: заработать 5 Stars за рекламу
    earnStars(5);
    alert('Earned 5 Stars from ad!');
  };

  const handleCollaborationRequest = (streamerId) => {
    if (allowedStreamers.includes(streamerId)) {
      console.log(`Collaboration request sent to ${streamerId}`);
    } else {
      alert('This streamer is not allowed to collaborate.');
    }
  };

  return React.createElement('div', null, [
    React.createElement('h1', null, `Profile: ${currentUser.name}`),
    React.createElement('p', null, `Followers: ${currentUser.followers || 0}`),
    React.createElement('p', null, `Role: ${isStreamer ? 'Streamer' : 'Follower'}`),
    React.createElement('p', null, `Stars: ${stars}`),
    isStreamer && [
      React.createElement('h2', null, 'Stream Schedule'),
      React.createElement('input', { type: 'date', value: selectedDate, onChange: (e) => setSelectedDate(e.target.value) }),
      React.createElement('input', { type: 'text', value: description, onChange: (e) => setDescription(e.target.value), placeholder: 'Stream description' }),
      React.createElement('button', { onClick: handleAddStream }, 'Add Stream'),
      streamSchedule.map((item, index) => React.createElement('div', { key: index }, `${item.date}: ${item.description}`)),
      React.createElement('h3', null, 'Viewer Voting'),
      streamSchedule.map((item, index) => React.createElement('div', { key: `vote-${index}` }, [
        React.createElement('p', null, item.date),
        React.createElement('button', { onClick: () => handleVote(item.date, 'Yes') }, 'Vote Yes'),
        React.createElement('button', { onClick: () => handleVote(item.date, 'No') }, 'Vote No')
      ])),
      React.createElement('h3', null, 'Collaborations'),
      React.createElement('input', { type: 'text', placeholder: 'Streamer ID for collab', onChange: (e) => setAllowedStreamers([...allowedStreamers, e.target.value]) }),
      React.createElement('button', { onClick: () => handleCollaborationRequest('streamer-id') }, 'Request Collaboration'),
      React.createElement('h3', null, 'Moderators & Trusted Followers'),
      React.createElement('input', { type: 'text', placeholder: 'Moderator ID', onChange: (e) => setModerators([...moderators, e.target.value]) }),
      React.createElement('input', { type: 'text', placeholder: 'Trusted Follower ID', onChange: (e) => setTrustedFollowers([...trustedFollowers, e.target.value]) }),
    ],
    !isStreamer && currentUser.followers < 265 && [
      React.createElement('h2', null, 'Become a Streamer'),
      React.createElement('p', null, `Followers needed: ${265 - currentUser.followers}`),
      React.createElement('p', null, 'Tips: Engage with your audience, stream regularly, use social media.'),
      React.createElement('p', null, 'Achievements: 50 followers – Basic Badge, 100 followers – Silver Badge'),
    ],
    React.createElement('h3', null, 'Rate Streamer'),
    [1, 2, 3, 4, 5].map((star) => React.createElement('button', { key: star, onClick: () => handleRateStreamer(star) }, star)),
    React.createElement('p', null, `Your rating: ${rating}, Streamer rating: ${streamerRating}`),
    React.createElement('h3', null, 'Ask a Question'),
    React.createElement('input', { type: 'text', value: question, onChange: (e) => setQuestion(e.target.value), placeholder: 'Your question' }),
    React.createElement('input', { type: 'number', value: questionPrice, onChange: (e) => setQuestionPrice(parseInt(e.target.value) || 10), min: 1, placeholder: 'Stars' }),
    React.createElement('button', { onClick: handleAskQuestion }, 'Ask'),
    React.createElement('button', { onClick: handleEarnStars }, 'Earn Stars (Watch Ad)'),
    React.createElement('a', { href: '/', onClick: (e) => { e.preventDefault(); window.history.back(); } }, 'Back'),
    React.createElement('button', { onClick: logout }, 'Logout')
  ]);
}

module.exports = Profile;
