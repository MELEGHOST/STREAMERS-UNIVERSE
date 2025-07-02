'use client';

import { useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Providers } from '../providers';
import I18nProvider from './I18nProvider';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"
import ReferralHandler from './ReferralHandler';
import RouteGuard from './RouteGuard';

function HtmlLangUpdater() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  return null;
}

function FontManager() {
  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize');
    const savedFontFamily = localStorage.getItem('fontFamily');

    if (savedFontSize) {
      document.documentElement.style.setProperty('--main-font-size', `${savedFontSize}px`);
    }

    if (savedFontFamily) {
      document.documentElement.style.setProperty('--main-font-family', savedFontFamily);
    }
  }, []);

  return null;
}

export default function ClientProvidersContent({ children }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <I18nProvider>
        <HtmlLangUpdater />
        <FontManager />
        <ReferralHandler />
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