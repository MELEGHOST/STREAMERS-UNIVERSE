import '../styles/globals.css';
import '../i18n';
import { Providers } from './providers';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"
import StyledComponentsRegistry from './lib/registry';

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <StyledComponentsRegistry>
          <Providers>
            <main>
              {children}
            </main>
            <Analytics />
            <SpeedInsights />
          </Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
} 