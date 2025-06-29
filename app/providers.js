'use client'

import dynamic from 'next/dynamic'

const AuthProvider = dynamic(
  () => import('./contexts/AuthContext').then((mod) => mod.AuthProvider),
  {
    ssr: false,
    loading: () => <div className="spinner-container"><div className="spinner"></div></div>,
  }
)

export function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
} 