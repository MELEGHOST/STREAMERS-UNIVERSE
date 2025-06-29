import '../styles/globals.css';
import ClientProviders from './components/ClientProviders';

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
} 