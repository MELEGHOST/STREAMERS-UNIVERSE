import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { AuthProvider } from '../src/context/AuthContext';

function MyApp({ Component, pageProps }) {
  return _jsx(AuthProvider, {
    children: _jsx(Component, { ...pageProps })
  });
}

export default MyApp;
