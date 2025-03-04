"use client";

import { AppProps } from 'next/app';
import '../../styles/global.css'; // Исправлен путь с ../styles/globals.css на ../../styles/global.css

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
