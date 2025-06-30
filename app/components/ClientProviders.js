'use client';
import dynamic from 'next/dynamic';

const ClientProvidersContent = dynamic(
  () => import('./ClientProvidersContent'),
  { 
    ssr: false,
    loading: () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner"></div></div>
  }
);

export default function ClientProviders({ children }) {
  return <ClientProvidersContent>{children}</ClientProvidersContent>;
} 