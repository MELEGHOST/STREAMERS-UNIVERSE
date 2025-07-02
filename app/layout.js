import '../styles/globals.css';
import ClientProviders from './components/ClientProviders';
import StyledComponentsRegistry from './lib/StyledComponentsRegistry';

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <StyledComponentsRegistry>
          <ClientProviders>{children}</ClientProviders>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
} 