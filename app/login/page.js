'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Перенаправляем на страницу авторизации в pages-маршрутизации
    router.push('/auth');
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)'
    }}>
      <div style={{ 
        color: '#fff', 
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: '30px',
        borderRadius: '10px',
        maxWidth: '500px'
      }}>
        <h2>Перенаправление на страницу авторизации...</h2>
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '5px solid rgba(255, 107, 129, 0.3)', 
            borderTop: '5px solid #ff6b81', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
} 