"use client";

import React from 'react';
import { AppProps } from 'next/app';
import '../styles/global.css'; // Относительный путь от pages/ к корню проекта
import CookieChecker from '../components/CookieChecker';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <React.Fragment>
      <Component {...pageProps} />
      <CookieChecker />
    </React.Fragment>
  );
}
