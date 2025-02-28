const React = require('react');
const { AuthProvider } = require('../src/context/AuthContext');
const styled = require('styled-components').default;

const Container = styled.div`
  background-color: #f5f5f5;
  min-height: 100vh;
  padding: 20px;
  font-family: 'Arial', sans-serif;
`;

const Logo = styled.img`
  max-width: 200px;
  margin-bottom: 20px;
`;

function MyApp({ Component, pageProps }) {
  return React.createElement(
    Container,
    null,
    [
      React.createElement(Logo, { src: '/logo.png', alt: 'Streamers Universe Logo' }),
      React.createElement(AuthProvider, null, React.createElement(Component, pageProps))
    ]
  );
}

module.exports = MyApp;
