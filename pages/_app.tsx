"use client";

import { AppProps } from 'next/app';
import '../styles/global.css'; // Относительный путь от pages/ к корню проекта

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
