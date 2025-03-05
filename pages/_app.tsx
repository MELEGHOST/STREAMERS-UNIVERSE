"use client";

import { AppProps } from 'next/app';
import '/styles/global.css'; // Абсолютный путь для public/

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
