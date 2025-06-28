import '../styles/globals.css';
import '../i18n';
import { Providers } from './providers';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
          <Providers>
            <main>
              {children}
            </main>
            <Analytics />
            <SpeedInsights />
          </Providers>
      </body>
    </html>
  );
} 