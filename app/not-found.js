'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();

  // Функция для возврата на предыдущую страницу
  const goBack = () => {
    router.back();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)',
      padding: '20px'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 0
      }}>
        {/* Звезды на фоне */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            backgroundColor: 'white',
            borderRadius: '50%',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `twinkle ${Math.random() * 5 + 3}s infinite`,
            opacity: Math.random()
          }} />
        ))}
      </div>
      
      <div style={{
        position: 'relative',
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: '30px',
        borderRadius: '10px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 0 20px rgba(255, 107, 129, 0.3)'
      }}>
        <h1 style={{ color: '#ff6b81', marginBottom: '20px', fontSize: '2.5rem' }}>
          404 - Страница не найдена
        </h1>
        <p style={{ color: '#fff', marginBottom: '30px', fontSize: '1.1rem' }}>
          Упс! Страница, которую вы ищете, не существует или была перемещена.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={goBack}
            style={{
              background: 'transparent',
              border: '2px solid #ff6b81',
              color: '#ff6b81',
              padding: '12px 24px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            Вернуться назад
          </button>
          <Link href="/menu" style={{
            background: '#ff6b81',
            border: 'none',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.3s ease',
            textDecoration: 'none',
            display: 'inline-block'
          }}>
            На главную
          </Link>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes twinkle {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
      `}</style>
    </div>
  );
} 