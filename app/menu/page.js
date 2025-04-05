'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link'; // Используем Link для навигации
import styles from './menu.module.css';
import { useAuth } from '../contexts/AuthContext'; 

export default function MenuPage() {
  const router = useRouter();
  const { user, supabase, isLoading, isAuthenticated } = useAuth(); 
  
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Перенаправляем на /auth, если не аутентифицирован (дублируем логику из AuthContext на всякий случай)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[MenuPage] Пользователь не аутентифицирован, перенаправление на /auth');
      router.push('/auth?message=Session+expired+or+not+found');
    }
  }, [isLoading, isAuthenticated, router]);

  // Функция выхода
  const handleLogout = useCallback(async () => {
    if (isLoggingOut || !supabase) return;
    setIsLoggingOut(true);
    console.log('[MenuPage] Выход...');
    setError(null); 
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('[MenuPage] Ошибка выхода:', signOutError);
        setError(`Ошибка выхода: ${signOutError.message}`);
        setIsLoggingOut(false); 
      } else {
        console.log('[MenuPage] Выход успешен. Редирект будет обработан AuthContext.');
        // Редирект произойдет из AuthContext
      }
    } catch (criticalError) {
      console.error('[MenuPage] Критическая ошибка выхода:', criticalError);
      setError('Критическая ошибка при выходе.');
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, supabase]);

  // Данные для отображения
  const displayName = user?.user_metadata?.full_name || user?.email || 'Загрузка...';
  // Пытаемся получить аватар из Twitch метаданных, если нет - дефолтный
  const avatarUrl = user?.user_metadata?.avatar_url || '/images/default_avatar.png'; 

  // Показываем индикатор загрузки, пока AuthContext проверяет сессию
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}> 
        <div className="spinner"></div>
        <p>Загрузка меню...</p>
      </div>
    );
  }

  // Если не аутентифицирован после загрузки
  if (!isAuthenticated) {
     return (
      <div className={styles.loadingContainer}>
        <p>Перенаправление на страницу входа...</p>
      </div>
    );
  }

  // --- Основная разметка меню --- 
  return (
    <div className={styles.container}>
      {/* Шапка с информацией о пользователе */} 
      <header className={styles.header}>
        <Link href="/profile" className={styles.userInfo}>
          <Image 
            src={avatarUrl}
            alt="Аватар" 
            width={50} 
            height={50} 
            className={styles.avatar} 
            onError={(e) => { e.target.src = '/images/default_avatar.png'; }} // Запасной путь при ошибке
            priority
          />
          <span className={styles.userName}>{displayName}</span>
        </Link>
        {/* Место для доп. инфо (коины, админ-статус) */} 
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>} 

      {/* Навигация */} 
      <nav className={styles.navigation}>
        <ul>
          <li><Link href="/profile">Профиль</Link></li>
          <li><Link href="/search">Поиск</Link></li>
          <li><Link href="/followings">Вдохновители</Link></li>
          <li><Link href="/followers">Последователи</Link></li>
          <li><Link href="/reviews">Обзоры</Link></li>
          <li><Link href="/settings">Настройки</Link></li>
          {/* Ссылку на админку добавим позже с проверкой прав */} 
        </ul>
      </nav>

      {/* Кнопка выхода */} 
      <footer className={styles.footer}>
        <button 
          onClick={handleLogout}
          className={styles.logoutButton}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Выход...' : 'Выйти'}
        </button>
      </footer>
    </div>
  );
} 