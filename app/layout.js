import '../styles/globals.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next";
import ClientProviders from './components/ClientProviders';

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
} 