import './styles/globals.css';
import { AuthProvider } from './contexts/AuthContext';

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <main>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
} 