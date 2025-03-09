'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './reviews.module.css';
import ReviewCategories from '../components/ReviewCategories';
import { DataStorage } from '../utils/dataStorage';

export default function Reviews() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Проверяем авторизацию
        const isAuth = DataStorage.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (!isAuth) {
          // Если не авторизован, перенаправляем на страницу логина
          router.push('/login');
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleReturnToMenu = () => {
    router.push('/menu');
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleReturnToMenu} className={styles.returnButton}>
          <span className={styles.returnIcon}>←</span>
          Вернуться в меню
        </button>
        <h1 className={styles.title}>Отзывы стримеров о товарах</h1>
      </div>
      
      <p className={styles.description}>
        Здесь собраны отзывы стримеров о товарах и сервисах, которые они используют для своей деятельности.
        Выберите категорию, чтобы просмотреть отзывы или добавить свой.
      </p>
      
      <ReviewCategories />
      
      <div className={styles.infoSection}>
        <h2 className={styles.infoTitle}>Как это работает?</h2>
        <div className={styles.infoBlocks}>
          <div className={styles.infoBlock}>
            <div className={styles.infoIcon}>📝</div>
            <h3>Отзывы от стримеров</h3>
            <p>Все отзывы в системе оставлены реальными стримерами, которые используют эти товары в своей работе.</p>
          </div>
          <div className={styles.infoBlock}>
            <div className={styles.infoIcon}>🔎</div>
            <h3>Честные мнения</h3>
            <p>Мы не редактируем отзывы и показываем как положительные, так и отрицательные стороны товаров.</p>
          </div>
          <div className={styles.infoBlock}>
            <div className={styles.infoIcon}>🎮</div>
            <h3>Для стримеров</h3>
            <p>Отзывы ориентированы на потребности стримеров: качество звука, изображения, удобство и другие важные параметры.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 