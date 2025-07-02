import '../styles/globals.css';
import ClientProviders from './components/ClientProviders';
import Header from './components/Header/Header';

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ClientProviders>
          <Header />
          <main>{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
} 