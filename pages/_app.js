const React = require('react');
const { AuthProvider } = require('../src/context/AuthContext');

function MyApp({ Component, pageProps }) {
  return React.createElement(AuthProvider, null, React.createElement(Component, pageProps));
}

module.exports = MyApp;
