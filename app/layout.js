import '../styles/global.css';
import { Inter } from 'next/font/google';
import CookieChecker from '../components/CookieChecker';
import ThemeProvider from '../components/ThemeProvider';
import { AuthProvider } from './providers/AuthProvider';
import { Suspense } from 'react';
import PageTransition from '../components/PageTransition';

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
        <AuthProvider>
          <ThemeProvider>
            <PageTransition>
              {children}
            </PageTransition>
            <CookieChecker />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
} 