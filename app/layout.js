import '../styles/global.css';
import { Inter } from 'next/font/google';
import CookieChecker from '../components/CookieChecker';
import ThemeProvider from '../components/ThemeProvider';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и их зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <CookieChecker />
        </ThemeProvider>
      </body>
    </html>
  );
} 