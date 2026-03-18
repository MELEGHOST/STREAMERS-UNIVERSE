'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import styles from './achievements.module.css';
import pageStyles from '../../styles/page.module.css';
import RouteGuard from '../components/RouteGuard';
import { useTranslation } from 'react-i18next';

// --- Фетчер для SWR --- 
const fetcher = async (url, token) => {
    if (!token) throw new Error('Authentication token is missing');
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.');
        error.info = await res.json();
        error.status = res.status;
        throw error;
    }
    return res.json();
};

// Компонент для отображения одного достижения
function AchievementCard({ achievement, t }) {
    const nameKey = `achievements.${achievement.code}.name`;
    const descriptionKey = `achievements.${achievement.code}.description`;
    const conditionKey = `achievements.${achievement.code}.condition`;

    return (
        <div className={`${styles.achievementCard} ${achievement.is_unlocked ? styles.unlocked : styles.locked}`}>
            <div className={styles.achievementIcon}>{achievement.icon || '🏅'}</div>
            <div className={styles.achievementInfo}>
                <h3 className={styles.achievementName}>{t(nameKey)}</h3>
                <p className={styles.achievementDescription}>{t(descriptionKey)}</p>
                <p className={styles.achievementCondition}>
                    {t('profile_page.achievements_page.condition')}: {t(conditionKey)}
                </p>
            </div>
        </div>
    );
}

function AchievementsPageContent() {
  const { /* user, */ isLoading: authLoading, isAuthenticated, supabase } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all'); // Начнем со всех
  const { t } = useTranslation();

  // --- Получаем токен для запроса --- 
  const [authToken, setAuthToken] = useState(null);
  useEffect(() => {
      const getToken = async () => {
          if (isAuthenticated && supabase) {
              const session = await supabase.auth.getSession();
              setAuthToken(session.data.session?.access_token || null);
          } else {
              setAuthToken(null);
          }
      };
      if (!authLoading) {
         getToken();
      }
  }, [isAuthenticated, supabase, authLoading]);

  // --- Запрос данных через SWR --- 
  const { data: apiData, error: apiError, isLoading: dataIsLoading } = useSWR(
      // Ключ SWR - массив. Если токен еще не загружен, SWR не будет делать запрос.
      // Если пользователь не аутентифицирован, токен будет null, и fetcher его не отправит.
      ['/api/achievements', authToken], 
      ([url, token]) => fetcher(url, token), 
      {
          revalidateOnFocus: true,
          onError: (err) => { console.error('[AchievementsPage useSWR onError]', err); },
          errorRetryCount: 3,
          errorRetryInterval: 5000
      }
  );
  
  // --- Логика состояния загрузки и ошибок --- 
  const isLoading = authLoading || dataIsLoading;
  const error = apiError ? (apiError.message === 'No response from server' ? 'Сервер не отвечает, попробуй позже, бро!' : apiError.message) : null;

  // --- Извлекаем данные из ответа API ---
  const achievements = useMemo(() => {
    if (!apiData) return [];
    // API возвращает { achievements: [...] }
    return Array.isArray(apiData) ? apiData : (Array.isArray(apiData?.achievements) ? apiData.achievements : []);
  }, [apiData]);
  const myAchievements = useMemo(() => achievements.filter(ach => ach.is_unlocked), [achievements]);

   // --- Рендеринг --- 
   if (isLoading) {
       return (
           <div className={pageStyles.loadingContainer}>
               <p>Загрузка...</p>
           </div>
       );
   }

  return (
    <div className={pageStyles.container}>
      <header className={styles.header}>
        <h1>{t('profile_page.achievements_page.title')}</h1>
      </header>
      <button onClick={() => router.back()} className={pageStyles.backButton} style={{ marginBottom: '1rem' }}>
        &larr; {t('achievements_page.backButton', { defaultValue: 'Назад' })}
      </button>

      <div className={styles.tabs}>
        {/* Вкладка "Мои достижения" */}
        <button 
          className={`${styles.tabButton} ${activeTab === 'my' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('my')}
        >
          {t('profile_page.achievements_page.unlocked')} ({myAchievements.length})
        </button>
        {/* Вкладка "Все достижения" */}
        <button 
          className={`${styles.tabButton} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('all')}
        >
          {t('profile_page.achievements_page.all')} ({achievements.length})
        </button>
      </div>

      {error && <div className={pageStyles.errorMessage} style={{ marginBottom: '1rem' }}>{t('achievements.page.error', { defaultValue: 'Error loading achievements' })} - {error} - Please try again later.</div>}
      
      <div className={styles.achievementsList}>
         {activeTab === 'my' && (
             myAchievements.length === 0 
                 ? <p className={styles.noAchievements}>{t('profile_page.achievements_page.noAchievements')}</p>
                 : myAchievements.map(ach => <AchievementCard key={ach.id} achievement={ach} t={t} />)
         )}
         {activeTab === 'all' && (
             achievements.length === 0
                 ? <p className={styles.noAchievements}>{t('profile_page.achievements_page.noAchievementsAll', { defaultValue: 'No achievements available yet' })}</p>
                 : achievements.map(ach => <AchievementCard key={ach.id} achievement={ach} t={t} />)
         )}
      </div>
       
    </div>
  );
}

export default function AchievementsPage() {
    return (
        <RouteGuard>
            <AchievementsPageContent />
        </RouteGuard>
    )
} 

