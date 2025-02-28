const React = require('react');
const { useAuth } = require('../src/context/AuthContext');

function Home() {
  const { isAuthenticated, getGreeting } = useAuth();

  return React.createElement('div', null, [
    React.createElement('h1', null, `${getGreeting()}, Welcome to Streamers Universe!`),
    !isAuthenticated && React.createElement('a', { href: '/auth' }, 'Login with Twitch'),
    isAuthenticated && React.createElement('a', { href: '/profile' }, 'Go to Profile')
  ]);
}

module.exports = Home;
