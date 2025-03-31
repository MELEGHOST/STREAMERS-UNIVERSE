'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UploadForm from './UploadForm';
import { createBrowserClient } from '@supabase/ssr';
import styles from './page.module.css';

export default function UploadPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ), 
  []);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('UploadPage: Сессия не найдена, редирект на /auth');
          router.push('/auth?reason=unauthenticated&redirect=/reviews/upload');
        } else {
          console.log('UploadPage: Сессия найдена');
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('UploadPage: Ошибка при проверке сессии Supabase:', error);
        router.push('/auth?reason=session_error');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
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
      
      <UploadForm supabase={supabase} />
    </div>
  );
} 