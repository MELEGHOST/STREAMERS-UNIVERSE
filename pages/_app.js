const React = require('react');

function MyApp({ Component, pageProps }) {
  return React.createElement(Component, pageProps);
}

module.exports = MyApp;
