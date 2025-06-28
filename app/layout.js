import '../i18n';

import '../styles/globals.css';
import { Providers } from './providers';
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
          </Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
} 