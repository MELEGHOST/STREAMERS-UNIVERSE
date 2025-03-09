import '../styles/global.css';
import { Inter } from 'next/font/google';
import CookieChecker from '../components/CookieChecker';
import ThemeProvider from '../components/ThemeProvider';
import { AuthProvider } from './providers/AuthProvider';

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
            {children}
            <CookieChecker />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
} 