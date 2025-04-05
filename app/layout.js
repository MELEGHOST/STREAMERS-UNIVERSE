import '../styles/global.css';
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';

export const metadata = {
  title: 'Streamers Universe',
  description: 'Центр сообщества стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
} 