'use client'

import { AuthProvider } from './contexts/AuthContext'

export function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
} 