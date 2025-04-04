import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from './404.module.css'; // Используем собственные стили для страницы 404

export default function Custom404() {
  const router = useRouter();

  // console.error('Ошибка 404: Страница не найдена', {
  //   path: router.asPath,
  //   query: router.query
  // });

  // Функция для возврата на главную страницу
  const goToHome = () => {
    router.push('/menu');
  };

  // Функция для возврата на предыдущую страницу
  const goBack = () => {
    router.back();
  };

  return (
    <div className={styles.container}>
      <div className={styles.stars} />
      <div className={styles.authContainer}>
        <h1 style={{ color: '#ff6b81', marginBottom: '20px', textAlign: 'center' }}>
          404 - Страница не найдена
        </h1>
        <p style={{ color: '#fff', marginBottom: '30px', textAlign: 'center' }}>
          Упс! Страница, которую вы ищете, не существует или была перемещена.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <button
            onClick={goBack}
            style={{
              background: 'transparent',
              border: '2px solid #ff6b81',
              color: '#ff6b81',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            Вернуться назад
          </button>
          <button
            onClick={goToHome}
            style={{
              background: '#ff6b81',
              border: 'none',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  );
} 