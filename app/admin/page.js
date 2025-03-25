'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAdminAccess } from '../utils/adminUtils';
import styles from './page.module.css';

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState({ isAdmin: false, role: null });
  const [error, setError] = useState(null);

  // Проверка прав администратора
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const access = await checkAdminAccess();
        setAdminInfo(access);
        
        if (!access.isAdmin) {
          router.push('/menu');
          return;
        }
      } catch (err) {
        console.error('Ошибка при проверке прав администратора:', err);
        setError('Произошла ошибка при проверке прав администратора');
      } finally {
        setLoading(false);
      }
    };
    
    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка панели администратора...</p>
      </div>
    );
  }

  // Если нет прав администратора, отображаем пустой компонент (произойдет редирект)
  if (!adminInfo.isAdmin) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Панель администратора</h1>
        <div className={styles.role}>Ваша роль: {adminInfo.role}</div>
      </div>
      
      {error && (
        <div className={styles.error}>{error}</div>
      )}
      
      <div className={styles.menu}>
        <h2 className={styles.sectionTitle}>Управление контентом</h2>
        <div className={styles.menuGrid}>
          <Link href="/admin/reviews" className={styles.menuItem}>
            <div className={styles.menuIcon}>📝</div>
            <div className={styles.menuInfo}>
              <h3>Модерация отзывов</h3>
              <p>Просмотр, одобрение и отклонение отзывов пользователей</p>
            </div>
          </Link>
          
          {/* Другие элементы админ-панели могут быть добавлены здесь */}
        </div>
      </div>
      
      <Link href="/menu" className={styles.backButton}>
        Вернуться в меню
      </Link>
    </div>
  );
} 