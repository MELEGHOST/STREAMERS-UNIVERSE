import React from 'react';
import { AuthProvider } from '../src/context/AuthContext';
import '../styles/global.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
