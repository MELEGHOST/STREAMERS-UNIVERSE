'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './settings.module.css';
import pageStyles from '../../styles/page.module.css';
import { FaArrowLeft, FaPalette } from 'react-icons/fa'; // Иконки
import RouteGuard from '../components/RouteGuard';

function SettingsPageContent() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated, currentTheme, toggleTheme, signOut } = useAuth();

  // Редирект, если не авторизован
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    console.log('[SettingsPage] Выполняется выход...');
    await signOut();
    console.log('[SettingsPage] Выход завершен, перенаправление на главную...');
    router.push('/');
  };

  const handleGoToProfile = () => {
    router.push('/menu');
  };

  if (authLoading || !isAuthenticated) {
    return <div className={pageStyles.loadingContainer}><div className="spinner"></div></div>;
  }

  return (
    <div className={pageStyles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <FaArrowLeft /> Назад
        </button>
        <h1 className={styles.title}>Настройки</h1>
      </div>

      <div className={styles.settingsList}>
        {/* --- Переключатель темы --- */}
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <FaPalette className={styles.settingIcon} />
            <span className={styles.settingLabel}>Тема оформления</span>
          </div>
          <button onClick={toggleTheme} className={styles.themeToggleButton}>
            {currentTheme === 'dark' ? 'Светлая' : 'Темная'}
          </button>
        </div>

        {/* --- Другие настройки (пока заглушки) --- */}
        <div className={`${styles.settingItem} ${styles.disabledSetting}`}>
          <div className={styles.settingInfo}>
            <FaPalette className={styles.settingIcon} />
            <span className={styles.settingLabel}>Язык интерфейса</span>
          </div>
          <span className={styles.settingValue}>Русский (скоро...)</span>
        </div>

        <div className={`${styles.settingItem} ${styles.disabledSetting}`}>
          <div className={styles.settingInfo}>
            <FaPalette className={styles.settingIcon} />
            <span className={styles.settingLabel}>Шрифт</span>
          </div>
          <span className={styles.settingValue}>Стандартный (скоро...)</span>
        </div>

        <div className={`${styles.settingItem} ${styles.disabledSetting}`}>
          <div className={styles.settingInfo}>
            <FaPalette className={styles.settingIcon} />
            <span className={styles.settingLabel}>Часовой пояс</span>
          </div>
          <span className={styles.settingValue}>Авто (скоро...)</span>
        </div>

        {/* Кнопка выхода */}
        <div className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>Аккаунт</h2>
          <button
            onClick={handleLogout}
            className={`${styles.settingsButton} ${styles.logoutButton}`}
          >
            Выйти из аккаунта
          </button>
        </div>

        <div className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>Профиль</h2>
          <button onClick={handleGoToProfile} className={styles.settingsButton}>
            Перейти в профиль
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RouteGuard>
      <SettingsPageContent />
    </RouteGuard>
  );
} 