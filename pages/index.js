const React = require('react');
const { useAuth } = require('../src/context/AuthContext');
const styled = require('styled-components').default;

const HomeContainer = styled.div`
  text-align: center;
  padding: 50px;
  background: linear-gradient(135deg, #e0e7ff, #ffffff);
  min-height: 100vh;
`;

const Title = styled.h1`
  font-family: 'Pacifico', cursive;
  color: #2c3e50;
  font-size: 2.5em;
  margin-bottom: 20px;
`;

const Button = styled.a`
  display: inline-block;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2980b9;
  }
`;

function Home() {
  const { isAuthenticated, getGreeting } = useAuth();

  return React.createElement(
    HomeContainer,
    null,
    [
      React.createElement(Title, null, `${getGreeting()}, Welcome to Streamers Universe!`),
      !isAuthenticated && React.createElement(Button, { href: '/auth' }, 'Login with Twitch'),
      isAuthenticated && React.createElement(Button, { href: '/profile' }, 'Go to Profile')
    ]
  );
}

module.exports = Home;
