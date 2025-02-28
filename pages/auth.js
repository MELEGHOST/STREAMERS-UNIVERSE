// pages/auth.js
const React = require('react');
const { useRouter } = require('next/router');

function Auth() {
  const router = useRouter();
  const { role } = router.query;

  const handleTwitchLogin = async () => {
    try {
      const response = await fetch('/api/auth/twitch', { method: 'GET' });
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url + (role ? `&state=${role}` : '');
      } else {
        console.error('Failed to initiate Twitch login');
      }
    } catch (err) {
      console.error('Error initiating Twitch login:', err);
    }
  };

  return React.createElement(
    'div',
    { style: { textAlign: 'center', padding: '50px', background: 'linear-gradient(to bottom, #001f3f, #003366)', color: 'white' } },
    [
      React.createElement('h1', null, 'Авторизация'),
      React.createElement('button', { onClick: handleTwitchLogin, style: { padding: '10px 20px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' } }, 'Войти через Twitch'),
    ]
  );
}

module.exports = Auth;
