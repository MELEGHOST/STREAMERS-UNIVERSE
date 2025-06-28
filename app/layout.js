import '../styles/globals.css';
import { Providers } from './providers';
import I18nProvider from './components/I18nProvider';
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