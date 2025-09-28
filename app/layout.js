import '../styles/globals.css';
import ClientProviders from './components/ClientProviders';
import StyledComponentsRegistry from './lib/StyledComponentsRegistry';
import TransitionProvider from './components/TransitionProvider';

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <StyledComponentsRegistry>
          <TransitionProvider>
            <ClientProviders>{children}</ClientProviders>
          </TransitionProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
