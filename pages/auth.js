const React = require('react');
const { useAuth } = require('../src/context/AuthContext');

function Auth() {
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = React.useState(null);

  const handleTwitchLogin = async () => {
    try {
      const response = await fetch('/api/auth/twitch', { method: 'GET' });
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        setError('Failed to initiate Twitch login');
      }
    } catch (err) {
      setError('Error initiating Twitch login: ' + err.message);
    }
  };

  if (isAuthenticated) {
    return React.createElement('div', null, [
      React.createElement('p', null, 'You are already logged in!'),
      React.createElement('a', { href: '/', onClick: (e) => { e.preventDefault(); window.history.back(); } }, 'Back'),
      React.createElement('a', { href: '/profile' }, 'Go to Profile')
    ]);
  }

  return React.createElement('div', null, [
    React.createElement('h1', null, 'Login with Twitch'),
    error && React.createElement('p', { style: { color: 'red' } }, error),
    React.createElement('button', { onClick: handleTwitchLogin }, 'Login with Twitch'),
    React.createElement('button', { onClick: () => window.history.back() }, 'Back')
  ]);
}

module.exports = Auth;
