'use client';

import { useEffect, Suspense } from 'react';
import { Providers } from '../providers';
import I18nProvider from './I18nProvider';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"
import ReferralHandler from './ReferralHandler';
import RouteGuard from './RouteGuard';

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
    <Suspense fallback={<div>Loading...</div>}>
      <FontManager />
      <ReferralHandler />
      <I18nProvider>
        <Providers>
          <RouteGuard>
            <main>
              {children}
            </main>
            <Analytics />
            <SpeedInsights />
          </RouteGuard>
        </Providers>
      </I18nProvider>
    </Suspense>
  );
} 