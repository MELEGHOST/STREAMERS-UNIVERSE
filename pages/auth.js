const React = require('react');
const { useAuth } = require('../src/context/AuthContext');
const styled = require('styled-components').default;

const AuthContainer = styled.div`
  text-align: center;
  padding: 50px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  margin: 0 auto;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2980b9;
  }
`;

const Error = styled.p`
  color: red;
  margin-top: 10px;
`;

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
    return React.createElement(
      AuthContainer,
      null,
      [
        React.createElement('p', null, 'You are already logged in!'),
        React.createElement(Button, { onClick: () => window.history.back() }, 'Back'),
        React.createElement(Button, { onClick: () => router.push('/profile') }, 'Go to Profile')
      ]
    );
  }

  return React.createElement(
    AuthContainer,
    null,
    [
      React.createElement('h1', null, 'Login with Twitch'),
      error && React.createElement(Error, null, error),
      React.createElement(Button, { onClick: handleTwitchLogin }, 'Login with Twitch'),
      React.createElement(Button, { onClick: () => window.history.back() }, 'Back')
    ]
  );
}

module.exports = Auth;
