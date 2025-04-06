'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './achievements.module.css';
import pageStyles from '../../styles/page.module.css';

// Пример структуры данных достижения
// const exampleAchievement = {
//   id: 'first_stream',
//   name: 'Первый стрим',
//   description: 'Провести первую трансляцию.',
//   icon: '🏆', // Можно заменить на URL иконки
//   unlocked: true, // или false
//   condition: 'Провести хотя бы одну трансляцию', // Описание условия
//   progress: null, // { current: 1, target: 1 } или null
// };

const exampleAllAchievements = [
   { id: 'first_stream', name: 'Первый стрим', description: 'Провести первую трансляцию.', icon: '🚀', condition: 'Провести трансляцию' },
   { id: 'follower_goal_10', name: '10 Фолловеров', description: 'Собрать 10 фолловеров на Twitch.', icon: '👥', condition: '10+ фолловеров' },
   { id: 'watch_time_1h', name: 'Час в эфире', description: 'Набрать 1 час просмотра ваших трансляций.', icon: '⏱️', condition: '1 час просмотра' },
   { id: 'first_review', name: 'Первый отзыв', description: 'Написать свой первый отзыв.', icon: '✍️', condition: 'Написать отзыв' },
   { id: 'affiliate_status', name: 'Компаньон Twitch', description: 'Получить статус компаньона на Twitch.', icon: '🤝', condition: 'Статус компаньона' },
];

// Компонент для отображения одного достижения
function AchievementCard({ achievement, isUnlocked }) {
    return (
        <div className={`${styles.achievementCard} ${isUnlocked ? styles.unlocked : styles.locked}`}>
            <div className={styles.achievementIcon}>{achievement.icon}</div>
            <div className={styles.achievementInfo}>
                <h3 className={styles.achievementName}>{achievement.name}</h3>
                <p className={styles.achievementDescription}>{achievement.description}</p>
                 {/* Можно добавить отображение прогресса, если он есть */} 
                {!isUnlocked && achievement.condition && <p className={styles.achievementCondition}>Условие: {achievement.condition}</p>}
            </div>
        </div>
    );
}


export default function AchievementsPage() {
  const { user, isLoading, isAuthenticated, supabase } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('my'); // 'my' или 'all'
  const [myAchievements, setMyAchievements] = useState([]);
  const [allAchievements] = useState(exampleAllAchievements); 
  const [loadingAch, setLoadingAch] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth?next=/achievements');
    } else if (isAuthenticated && user && supabase) {
       // TODO: Загрузить реальные достижения пользователя и все достижения с API
       setLoadingAch(true);
       setError(null);
       // Здесь будет fetch к /api/achievements
       // fetch('/api/achievements?userId=' + user.id).then(...).catch(...)
       // Пока используем заглушки:
       setTimeout(() => { // Имитация загрузки
            // Предположим, пользователь открыл только первое достижение
            const unlockedIds = ['first_stream']; 
            const userAch = allAchievements.filter(ach => unlockedIds.includes(ach.id));
            setMyAchievements(userAch);
            setLoadingAch(false);
       }, 500);
    }
  }, [isLoading, isAuthenticated, user, supabase, router, allAchievements]);

   if (isLoading) {
       return (
           <div className={pageStyles.loadingContainer}>
               <div className="spinner"></div><p>Загрузка...</p>
           </div>
       );
   }
   if (!isAuthenticated) { return null; }

  return (
    <div className={pageStyles.container}>
      <h1 className={styles.title}>Достижения</h1>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'my' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('my')}
        >
          Мои достижения
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Все достижения
        </button>
      </div>

      {error && <div className={pageStyles.errorMessage} style={{ marginBottom: '1rem' }}>{error}</div>}
      
      {loadingAch ? (
            <div className={pageStyles.loadingContainer}>
                <div className="spinner"></div><p>Загрузка достижений...</p>
            </div>
       ) : (
          <div className={styles.achievementsList}>
             {activeTab === 'my' && (
                 myAchievements.length === 0 
                     ? <p className={styles.noAchievements}>У вас пока нет разблокированных достижений.</p>
                     : myAchievements.map(ach => <AchievementCard key={ach.id} achievement={ach} isUnlocked={true} />)
             )}
             {activeTab === 'all' && (
                 allAchievements.map(ach => {
                     const isUnlocked = myAchievements.some(myAch => myAch.id === ach.id);
                     return <AchievementCard key={ach.id} achievement={ach} isUnlocked={isUnlocked} />;
                 })
             )}
          </div>
       )}

       <button onClick={() => router.back()} className={pageStyles.backButton} style={{ marginTop: '2rem' }}>
           &larr; Назад
       </button>
    </div>
  );
} 