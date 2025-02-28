// pages/index.js
const React = require('react');
const { useAuth } = require('../src/context/AuthContext');
const styled = require('styled-components').default;

const Container = styled.div`
  background: linear-gradient(to bottom, #001f3f, #003366);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Arial', sans-serif;
`;

const Logo = styled.img`
  max-width: 200px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  color: white;
  font-size: 2.5em;
  margin-bottom: 20px;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 20px;
`;

const Button = styled.a`
  padding: 10px 20px;
  background-color: #8e44ad;
  color: white;
  text-decoration: none;
  border-radius: 50%;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #732d91;
  }
`;

function Home() {
  const { isAuthenticated } = useAuth();
  console.log('Debug: isAuthenticated:', isAuthenticated);

  return React.createElement(
    Container,
    null,
    [
      React.createElement(Logo, { src: '/logo.png', alt: 'Streamers Universe Logo' }),
      React.createElement(Title, null, 'Кто вы?'),
      React.createElement(ButtonContainer, null, [
        React.createElement(Button, { href: '/auth?role=streamer' }, 'Я стример'),
        React.createElement(Button, { href: '/auth?role=subscriber' }, 'Я подписчик')
      ])
    ]
  );
}

module.exports = Home;
