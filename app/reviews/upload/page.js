'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UploadForm from './UploadForm';
import { DataStorage } from '../../utils/dataStorage';
import styles from './page.module.css';

export default function UploadPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Проверяем авторизацию пользователя
    const checkAuth = async () => {
      const isAuth = DataStorage.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (!isAuth) {
        // Если пользователь не авторизован, перенаправляем на страницу авторизации
        router.push('/auth');
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Пользователь будет перенаправлен на страницу авторизации
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <Link href="/reviews" className={styles.backButton}>
          <span className={styles.backIcon}>←</span> Назад к отзывам
        </Link>
        <h1 className={styles.pageTitle}>Загрузить новый отзыв</h1>
      </div>
      
      <div className={styles.description}>
        <p>
          Загрузите файлы с отзывом (фото, видео, текст), и наша система автоматически 
          обработает их с помощью искусственного интеллекта.
        </p>
        <p>
          После модерации отзыв будет опубликован с указанием источников.
        </p>
      </div>
      
      <UploadForm />
    </div>
  );
} 