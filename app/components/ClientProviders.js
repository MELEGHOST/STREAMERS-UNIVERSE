'use client';

import { useEffect } from 'react';
import { Providers } from '../providers';
import I18nProvider from './I18nProvider';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"

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

export default function ClientProviders({ children }) {
  return (
    <>
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
    </>
  );
} 