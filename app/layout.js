'use client';
import { useEffect } from 'react';
import '../styles/globals.css';
import { Providers } from './providers';
import I18nProvider from './components/I18nProvider';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

function FontManager() {
  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize');
    const savedFontFamily = localStorage.getItem('fontFamily');

    if (savedFontSize) {
      document.documentElement.style.fontSize = `${savedFontSize}px`;
    }

    if (savedFontFamily) {
      document.documentElement.style.fontFamily = savedFontFamily;
    }
  }, []);

  return null;
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <FontManager />
        <I18nProvider>
          <Providers>
            <main>
              {children}
            </main>
            <Analytics />
            <SpeedInsights />
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
} 