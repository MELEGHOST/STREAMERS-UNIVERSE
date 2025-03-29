import '../styles/global.css';
import { Inter } from 'next/font/google';
import ThemeProvider from '../components/ThemeProvider';
import { AuthProvider } from '../contexts/AuthContext';
import { NextAuthProvider } from './providers';
import { SessionProvider } from 'next-auth/react';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from 'next/script';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata = {
  title: {
    template: '%s | Streamers Universe',
    default: 'Streamers Universe',
  },
  description: 'Платформа для стримеров и их зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <NextAuthProvider>
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
} 