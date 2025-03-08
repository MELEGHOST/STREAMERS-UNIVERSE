import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // Перенаправляем на страницу авторизации
    router.replace('/auth');
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
        color: 'white', 
        textAlign: 'center',
        padding: '20px',
        borderRadius: '10px',
        background: 'rgba(0, 0, 0, 0.5)'
      }}>
        <h2>Перенаправление на страницу авторизации...</h2>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid rgba(255, 255, 255, 0.3)', 
          borderTop: '5px solid #fff', 
          borderRadius: '50%',
          margin: '20px auto',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 