import '../styles/globals.css';
import ClientProviders from './components/ClientProviders';
import Header from './components/Header/Header';
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
          <ClientProviders>
            <Header />
            <main>{children}</main>
          </ClientProviders>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
} 