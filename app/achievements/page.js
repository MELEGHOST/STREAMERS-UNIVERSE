'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import styles from './achievements.module.css';
import pageStyles from '../../styles/page.module.css';
import RouteGuard from '../components/RouteGuard';

// --- Фетчер для SWR --- 
const fetcher = async (url, token) => {
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
        const errorInfo = { status: res.status, message: await res.text() };
        console.error("[Achievements fetcher] Error:", errorInfo);
        throw new Error(errorInfo.message || `Ошибка API (${res.status})`);
    }
    return res.json();
};

// Компонент для отображения одного достижения
function AchievementCard({ achievement }) {
    return (
        <div className={`${styles.achievementCard} ${achievement.is_unlocked ? styles.unlocked : styles.locked}`}>
            <div className={styles.achievementIcon}>{achievement.icon || '🏅'}</div>
            <div className={styles.achievementInfo}>
                <h3 className={styles.achievementName}>{achievement.name}</h3>
                <p className={styles.achievementDescription}>{achievement.description}</p>
                {/* Условие берем из condition_description */} 
                {achievement.condition_description && 
                    <p className={styles.achievementCondition}>
                        Условие: {achievement.condition_description}
                    </p>}
                 {/* Можно добавить отображение прогресса, если он есть и ачивка не разблокирована */}
                 {/* achievement.trigger_type && achievement.trigger_value && !achievement.is_unlocked && ... */}
            </div>
        </div>
    );
}

function AchievementsPageContent() {
  const { /* user, */ isLoading: authLoading, isAuthenticated, supabase } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all'); // Начнем со всех

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
          onError: (err) => { console.error('[AchievementsPage useSWR onError]', err); }
      }
  );
  
  // --- Логика состояния загрузки и ошибок --- 
  const isLoading = authLoading || dataIsLoading;
  const error = apiError?.message || null;

  // --- Извлекаем данные из ответа API ---
  const achievements = useMemo(() => apiData?.achievements || [], [apiData]);
  const myAchievements = useMemo(() => achievements.filter(ach => ach.is_unlocked), [achievements]);

   // --- Рендеринг --- 
   if (isLoading) {
       return (
           <div className={pageStyles.loadingContainer}>
               <div className="spinner"></div><p>Загрузка достижений...</p>
           </div>
       );
   }

  return (
    <div className={pageStyles.container}>
      <h1 className={styles.title}>Достижения</h1>

      <div className={styles.tabs}>
        {/* Вкладка "Мои достижения" */}
        <button 
          className={`${styles.tabButton} ${activeTab === 'my' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('my')}
        >
          Мои достижения ({myAchievements.length})
        </button>
        {/* Вкладка "Все достижения" */}
        <button 
          className={`${styles.tabButton} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Все достижения ({achievements.length})
        </button>
      </div>

      {error && <div className={pageStyles.errorMessage} style={{ marginBottom: '1rem' }}>{error}</div>}
      
      <div className={styles.achievementsList}>
         {activeTab === 'my' && (
             myAchievements.length === 0 
                 ? <p className={styles.noAchievements}>У вас пока нет разблокированных достижений.</p>
                 : myAchievements.map(ach => <AchievementCard key={ach.id} achievement={ach} />)
         )}
         {activeTab === 'all' && (
             achievements.map(ach => <AchievementCard key={ach.id} achievement={ach} />)
         )}
      </div>
       
       <button onClick={() => router.back()} className={pageStyles.backButton} style={{ marginTop: '2rem' }}>
           &larr; Назад
       </button>
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