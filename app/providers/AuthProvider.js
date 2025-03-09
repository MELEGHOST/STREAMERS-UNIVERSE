'use client';

import { AuthProvider as AuthContextProvider } from '../../contexts/AuthContext';

export function AuthProvider({ children }) {
  return <AuthContextProvider>{children}</AuthContextProvider>;
} 