"use client";

import { AppProps } from 'next/app';
import '../styles/global.css'; // Исправлено с globals.css на global.css

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
