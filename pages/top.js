const React = require('react');
const { useAuth } = require('../src/context/AuthContext');
const styled = require('styled-components').default;

const TopContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 20px auto;
`;

function Top() {
  const { isAuthenticated, currentUser } = useAuth();
  const [topStreamers, setTopStreamers] = React.useState([]);

  React.useEffect(() => {
    if (isAuthenticated) {
      // Здесь можно добавить API-запрос для получения топа стримеров
      setTopStreamers([
        { name: 'Streamer1', rating: 4.5, followers: 1000 },
        { name: 'Streamer2', rating: 4.0, followers: 800 },
      ]);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return React.createElement('div', null, 'Please log in');
  }

  return React.createElement(
    TopContainer,
    null,
    [
      React.createElement('h1', null, 'Top Streamers'),
      topStreamers.map((streamer, index) => React.createElement('div', { key: index }, `${index + 1}. ${streamer.name} - Rating: ${streamer.rating}, Followers: ${streamer.followers}`))
    ]
  );
}

module.exports = Top;
