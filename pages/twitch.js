const React = require('react');
const { useAuth } = require('../src/context/AuthContext');
const styled = require('styled-components').default;

const TwitchContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 20px auto;
`;

function Twitch() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return React.createElement('div', null, 'Please log in');
  }

  return React.createElement(
    TwitchContainer,
    null,
    [
      React.createElement('h1', null, 'Twitch Integration'),
      React.createElement('p', null, 'Connect and manage your Twitch streams here.')
    ]
  );
}

module.exports = Twitch;
