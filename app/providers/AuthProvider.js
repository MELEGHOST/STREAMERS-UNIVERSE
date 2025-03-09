'use client';

import { memo } from 'react';
import { AuthProvider as AuthContextProvider } from '../../contexts/AuthContext';

// Используем memo для предотвращения лишних ререндеров
export const AuthProvider = memo(function AuthProvider({ children }) {
  return <AuthContextProvider>{children}</AuthContextProvider>;
}); 