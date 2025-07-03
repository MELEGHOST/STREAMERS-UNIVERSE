'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from '../../styles/page.module.css'; // Общие стили
import Loader from '../components/Loader/Loader';

export default function AdminPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (userRole === 'admin') {
      setCheckingRole(false);
    }
    if (userRole && userRole !== 'admin') {
      setCheckingRole(true);
      router.push('/menu?error=not_admin');
    }
  }, [userRole, router]);

  if (authLoading || checkingRole) {
    return (
      <div className={styles.loadingContainer}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Админ-панель</h1>
      <p>Добро пожаловать в панель управления.</p>
       <button onClick={() => router.push('/menu')} className={styles.backButton}>
        &larr; Назад в меню
      </button>
    </div>
  );
} 