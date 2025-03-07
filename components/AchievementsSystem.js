'use client';

import React, { useState, useEffect } from 'react';
import styles from './AchievementsSystem.module.css';

// Компонент системы достижений
const AchievementsSystem = ({ user, followerCount, isStreamer, streamsCompleted = 0, hasCollaborations = false }) => {
  const [achievements, setAchievements] = useState([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);

  // Список всех возможных достижений
  const allAchievements = [
    {
      id: 'first_login',
      title: 'Первый шаг',
      description: 'Войдите в приложение в первый раз',
      icon: '🚪',
      xp: 10,
      unlocked: true // Автоматически разблокировано при первом входе
    },
    {
      id: 'follower_10',
      title: 'Начало пути',
      description: 'Наберите 10 подписчиков',
      icon: '🌱',
      xp: 20,
      unlockCondition: () => followerCount >= 10
    },
    {
      id: 'follower_50',
      title: 'Растущая аудитория',
      description: 'Наберите 50 подписчиков',
      icon: '🌿',
      xp: 50,
      unlockCondition: () => followerCount >= 50
    },
    {
      id: 'follower_100',
      title: 'Сообщество расширяется',
      description: 'Наберите 100 подписчиков',
      icon: '🌳',
      xp: 100,
      unlockCondition: () => followerCount >= 100
    },
    {
      id: 'follower_200',
      title: 'Почти у цели',
      description: 'Наберите 200 подписчиков',
      icon: '🌟',
      xp: 200,
      unlockCondition: () => followerCount >= 200
    },
    {
      id: 'streamer_status',
      title: 'Официальный стример',
      description: 'Наберите 265 подписчиков и получите статус стримера',
      icon: '👑',
      xp: 265,
      unlockCondition: () => followerCount >= 265,
      reward: 'Доступ к расширенным функциям стримера'
    },
    {
      id: 'streams_5',
      title: 'Постоянство',
      description: 'Проведите 5 стримов по расписанию',
      icon: '📅',
      xp: 50,
      unlockCondition: () => streamsCompleted >= 5,
      requiresStreamer: true
    },
    {
      id: 'streams_20',
      title: 'Надежность',
      description: 'Проведите 20 стримов по расписанию',
      icon: '⏰',
      xp: 150,
      unlockCondition: () => streamsCompleted >= 20,
      requiresStreamer: true
    },
    {
      id: 'collab_first',
      title: 'Коллаборация',
      description: 'Проведите стрим с другим стримером',
      icon: '🤝',
      xp: 100,
      unlockCondition: () => hasCollaborations,
      requiresStreamer: true
    },
    {
      id: 'night_owl',
      title: 'Ночная сова',
      description: 'Войдите в приложение после 2 часов ночи',
      icon: '🦉',
      xp: 30,
      isSecret: true,
      unlockCondition: () => {
        const hour = new Date().getHours();
        return hour >= 2 && hour < 5;
      }
    },
    {
      id: 'easter_egg',
      title: 'Пасхалочник',
      description: 'Вы нашли секретную пасхалку!',
      icon: '🥚',
      xp: 50,
      isSecret: true,
      unlockCondition: () => showEasterEgg
    }
  ];

  // Проверить условия разблокировки достижений
  useEffect(() => {
    setAchievements(allAchievements);
    
    const unlocked = allAchievements.filter(achievement => {
      // Пропустить достижения, требующие статуса стримера, если пользователь не стример
      if (achievement.requiresStreamer && !isStreamer) return false;
      
      // Проверить условие разблокировки, если оно есть
      if (achievement.unlockCondition) {
        return achievement.unlockCondition();
      }
      
      // Если уже разблокировано или нет условия
      return achievement.unlocked || false;
    });
    
    setUnlockedAchievements(unlocked);
    
    // Проверить, найдена ли пасхалка
    if (secretClickCount >= 10) {
      setShowEasterEgg(true);
    }
  }, [followerCount, isStreamer, streamsCompleted, hasCollaborations, secretClickCount]);

  // Обработчик для скрытой пасхалки
  const handleSecretClick = () => {
    setSecretClickCount(prev => prev + 1);
  };

  // Расчет общего прогресса достижений
  const calculateProgress = () => {
    const totalAchievements = allAchievements.filter(a => 
      !a.isSecret && (!a.requiresStreamer || isStreamer)).length;
    const unlockedCount = unlockedAchievements.filter(a => !a.isSecret).length;
    return Math.round((unlockedCount / totalAchievements) * 100);
  };

  // Расчет общего количества XP
  const totalXP = unlockedAchievements.reduce((sum, achievement) => sum + achievement.xp, 0);

  // Компонент для отображения прогресса до статуса стримера
  const StreamerProgress = () => {
    if (isStreamer) return (
      <div className={styles.streamerStatus}>
        <h3>Вы достигли статуса стримера! 👑</h3>
        <p>Все функции стримера разблокированы.</p>
      </div>
    );

    const progressPercent = Math.min(100, (followerCount / 265) * 100);
    const remaining = 265 - followerCount;
    
    return (
      <div className={styles.streamerProgressContainer}>
        <h3>Путь к статусу стримера</h3>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div>
        </div>
        <p>{followerCount} из 265 подписчиков ({remaining} осталось)</p>
        
        <div className={styles.streamerTips}>
          <h4>Советы по развитию канала:</h4>
          <ul>
            <li>Установите регулярное расписание стримов</li>
            <li>Активно взаимодействуйте с чатом</li>
            <li>Делитесь анонсами стримов в социальных сетях</li>
            <li>Найдите свою нишу и уникальный стиль</li>
            <li>Улучшайте качество звука и изображения</li>
          </ul>
          
          {followerCount >= 50 && (
            <div className={styles.unlockedTip}>
              <h4>Разблокированный совет:</h4>
              <p>Создайте Discord-сервер для своего сообщества</p>
            </div>
          )}
          
          {followerCount >= 100 && (
            <div className={styles.unlockedTip}>
              <h4>Разблокированный совет:</h4>
              <p>Настройте ночатки и оповещения для стрима</p>
            </div>
          )}
          
          {followerCount >= 200 && (
            <div className={styles.unlockedTip}>
              <h4>Разблокированный совет:</h4>
              <p>Подумайте о создании расписания с разными типами контента</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.achievementsContainer}>
      <h2>Достижения и прогресс</h2>
      
      <div className={styles.achievementsSummary}>
        <div className={styles.xpCounter}>
          <span className={styles.xpIcon}>⭐</span>
          <span className={styles.xpAmount}>{totalXP} XP</span>
        </div>
        
        <div className={styles.overallProgress}>
          <p>Общий прогресс: {calculateProgress()}%</p>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {!isStreamer && <StreamerProgress />}
      
      <div className={styles.achievementsList}>
        <h3>Полученные достижения</h3>
        {unlockedAchievements.length === 0 ? (
          <p>У вас пока нет достижений. Начните свой путь!</p>
        ) : (
          <div className={styles.achievementsGrid}>
            {unlockedAchievements.map(achievement => (
              <div key={achievement.id} className={styles.achievementCard + ' ' + styles.unlocked}>
                <div className={styles.achievementIcon}>{achievement.icon}</div>
                <h4>{achievement.title}</h4>
                <p>{achievement.description}</p>
                <span className={styles.achievementXp}>+{achievement.xp} XP</span>
                {achievement.reward && (
                  <div className={styles.achievementReward}>
                    <span>Награда:</span> {achievement.reward}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <h3>Предстоящие достижения</h3>
        <div className={styles.achievementsGrid}>
          {achievements
            .filter(a => 
              !unlockedAchievements.find(ua => ua.id === a.id) && 
              !a.isSecret && 
              (!a.requiresStreamer || isStreamer)
            )
            .map(achievement => (
              <div key={achievement.id} className={styles.achievementCard + ' ' + styles.locked}>
                <div className={styles.achievementIcon + ' ' + styles.faded}>{achievement.icon}</div>
                <h4>{achievement.title}</h4>
                <p>{achievement.description}</p>
                <span className={styles.achievementXp}>+{achievement.xp} XP</span>
              </div>
            ))}
        </div>
        
        {/* Секретная область для пасхалки */}
        <div 
          className={styles.easterEggArea} 
          onClick={handleSecretClick}
        ></div>
        
        {/* Секретные достижения показываются только после разблокировки */}
        {unlockedAchievements.some(a => a.isSecret) && (
          <>
            <h3>Секретные достижения</h3>
            <div className={styles.achievementsGrid}>
              {unlockedAchievements
                .filter(a => a.isSecret)
                .map(achievement => (
                  <div key={achievement.id} className={`${styles.achievementCard} ${styles.secret} ${styles.unlocked}`}>
                    <div className={styles.achievementIcon}>{achievement.icon}</div>
                    <h4>{achievement.title}</h4>
                    <p>{achievement.description}</p>
                    <span className={styles.achievementXp}>+{achievement.xp} XP</span>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AchievementsSystem; 