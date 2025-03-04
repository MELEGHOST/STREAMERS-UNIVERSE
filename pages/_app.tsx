"use client";

import { AppProps } from 'next/app';
import '../styles/globals.css'; // Если есть глобальные стили

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
