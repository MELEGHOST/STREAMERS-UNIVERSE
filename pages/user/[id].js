import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../styles/userProfile.module.css';
import { useAuth } from '../../contexts/AuthContext';

export default function UserProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, userId } = useAuth();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('media');
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Добавляем состояние для модального окна сообщений
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Состояние для модального окна вопросов
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  
  useEffect(() => {
    if (!id) return;
    
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Получаем данные пользователя через API Twitch
        const response = await fetch(`/api/twitch/search?login=${id}`);
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить данные пользователя');
        }
        
        const data = await response.json();
        
        // Проверяем, есть ли данные о фолловерах и фолловингах
        if (!data.twitchData.follower_count || !data.twitchData.following_count) {
          console.log('Данные о фолловерах/фолловингах отсутствуют, запрашиваем дополнительно');
          
          // Если данных нет, запрашиваем их отдельно
          try {
            const twitchToken = localStorage.getItem('twitch_token');
            
            if (twitchToken) {
              // Запрашиваем фолловеров
              const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${data.twitchData.id}`, {
                headers: {
                  'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
                  'Authorization': `Bearer ${twitchToken}`
                }
              });
              
              if (followersResponse.ok) {
                const followersData = await followersResponse.json();
                data.twitchData.follower_count = followersData.total || 0;
              }
              
              // Запрашиваем фолловингов
              const followingResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${data.twitchData.id}`, {
                headers: {
                  'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
                  'Authorization': `Bearer ${twitchToken}`
                }
              });
              
              if (followingResponse.ok) {
                const followingData = await followingResponse.json();
                data.twitchData.following_count = followingData.total || 0;
              }
            }
          } catch (err) {
            console.error('Ошибка при получении данных о фолловерах/фолловингах:', err);
          }
        }
        
        // Проверяем, подписан ли текущий пользователь на просматриваемого
        let isFollowed = false;
        let subscribersCount = 0;
        let subscriptionsCount = 0;
        
        if (isAuthenticated && userId) {
          const storedSubscriptions = localStorage.getItem('su_subscriptions');
          
          if (storedSubscriptions) {
            try {
              const subscriptions = JSON.parse(storedSubscriptions);
              isFollowed = subscriptions.some(
                sub => sub.subscriberId === userId && sub.targetUserId === data.twitchData.id
              );
              
              // Получаем количество подписчиков
              subscribersCount = subscriptions.filter(
                sub => sub.targetUserId === data.twitchData.id
              ).length;
              
              // Получаем количество подписок
              subscriptionsCount = subscriptions.filter(
                sub => sub.subscriberId === data.twitchData.id
              ).length;
            } catch (e) {
              console.error('Ошибка при парсинге подписок из localStorage:', e);
            }
          }
        }
        
        // Добавляем данные о подписках в объект пользователя
        data.isFollowed = isFollowed;
        data.subscribersCount = subscribersCount;
        data.subscriptionsCount = subscriptionsCount;
        
        setUserData(data);
        setIsFollowing(isFollowed);
      } catch (err) {
        console.error('Ошибка при загрузке данных пользователя:', err);
        setError('Не удалось загрузить данные пользователя. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [id, isAuthenticated, userId]);
  
  const handleSubscribe = () => {
    if (!isAuthenticated) {
      alert('Пожалуйста, войдите в систему, чтобы подписаться на пользователя');
      return;
    }

    try {
      // Получаем текущие подписки из localStorage
      const storedSubscriptions = localStorage.getItem('su_subscriptions') || '[]';
      const subscriptions = JSON.parse(storedSubscriptions);
      
      if (isFollowing) {
        // Отписка: удаляем подписку из массива
        const updatedSubscriptions = subscriptions.filter(
          sub => !(sub.subscriberId === userId && sub.targetUserId === userData.twitchData.id)
        );
        localStorage.setItem('su_subscriptions', JSON.stringify(updatedSubscriptions));
        setIsFollowing(false);
        
        // Обновляем количество подписчиков
        setUserData(prev => ({
          ...prev,
          subscribersCount: Math.max(0, prev.subscribersCount - 1)
        }));
        
        alert('Вы успешно отписались от пользователя');
      } else {
        // Подписка: добавляем новую подписку в массив
        const newSubscription = {
          subscriberId: userId,
          targetUserId: userData.twitchData.id,
          targetUserName: userData.twitchData.display_name,
          targetUserAvatar: userData.twitchData.profile_image_url,
          subscriberName: localStorage.getItem('twitch_user_name') || 'Пользователь',
          subscriberAvatar: localStorage.getItem('twitch_user_avatar') || '',
          date: new Date().toISOString()
        };
        
        subscriptions.push(newSubscription);
        localStorage.setItem('su_subscriptions', JSON.stringify(subscriptions));
        setIsFollowing(true);
        
        // Обновляем количество подписчиков
        setUserData(prev => ({
          ...prev,
          subscribersCount: prev.subscribersCount + 1
        }));
        
        alert('Вы успешно подписались на пользователя');
      }
    } catch (err) {
      console.error('Ошибка при обновлении подписок:', err);
      alert('Произошла ошибка при обновлении подписки. Пожалуйста, попробуйте позже.');
    }
  };
  
  // Функция для отправки вопроса
  const handleSendQuestion = () => {
    if (!questionText.trim()) {
      alert('Пожалуйста, введите текст вопроса');
      return;
    }
    
    if (!isAuthenticated) {
      alert('Пожалуйста, войдите в систему, чтобы отправить вопрос');
      return;
    }
    
    try {
      // Создаем новый вопрос
      const newQuestion = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: userId,
        senderName: localStorage.getItem('twitch_user_name') || 'Пользователь',
        senderAvatar: localStorage.getItem('twitch_user_avatar') || '',
        recipientId: userData.twitchData.id,
        recipientName: userData.twitchData.display_name,
        recipientAvatar: userData.twitchData.profile_image_url,
        text: questionText,
        date: new Date().toISOString(),
        type: 'question',
        read: false
      };
      
      // Сохраняем вопрос в localStorage
      const storedMessages = localStorage.getItem('su_messages') || '[]';
      const messages = JSON.parse(storedMessages);
      messages.push(newQuestion);
      localStorage.setItem('su_messages', JSON.stringify(messages));
      
      // Закрываем модальное окно и очищаем поле ввода
      setIsQuestionModalOpen(false);
      setQuestionText('');
      
      // Показываем уведомление об успешной отправке
      alert('Вопрос успешно отправлен!');
    } catch (err) {
      console.error('Ошибка при отправке вопроса:', err);
      alert('Произошла ошибка при отправке вопроса. Пожалуйста, попробуйте позже.');
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Профиль пользователя | Streamers Universe</title>
        </Head>
        <div className={styles.authMessage}>
          <h2>Требуется авторизация</h2>
          <p>Пожалуйста, войдите в систему, чтобы просмотреть профиль пользователя.</p>
          <button onClick={() => router.push('/auth')} className={styles.authButton}>
            Войти
          </button>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Загрузка... | Streamers Universe</title>
        </Head>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка данных пользователя...</p>
        </div>
      </div>
    );
  }
  
  if (error || !userData) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Ошибка | Streamers Universe</title>
        </Head>
        <div className={styles.errorContainer}>
          <h2>Произошла ошибка</h2>
          <p>{error || 'Не удалось загрузить данные пользователя'}</p>
          <button onClick={() => router.back()} className={styles.backButton}>
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }
  
  const { twitchData, socialLinks, isRegisteredInSU } = userData;
  
  // Определяем статус пользователя
  const isStreamer = twitchData.follower_count >= 265;
  
  // Рендерим социальные ссылки
  const renderSocialLinks = () => {
    if (!socialLinks) return null;
    
    return (
      <div className={styles.socialLinks}>
        {socialLinks.twitch && (
          <a href={socialLinks.twitch} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#9146FF">
              <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43z" />
            </svg>
          </a>
        )}
        {socialLinks.youtube && (
          <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#FF0000">
              <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
            </svg>
          </a>
        )}
        {socialLinks.discord && (
          <a href={socialLinks.discord} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#7289DA">
              <path d="M22 24L16.75 19H17.38L15.38 17H20.12C21.16 17 22 16.16 22 15.12V4.88C22 3.84 21.16 3 20.12 3H3.88C2.84 3 2 3.84 2 4.88V15.12C2 16.16 2.84 17 3.88 17H8.62L13.5 21.5L12.5 17H13.25L14.25 19H16L17.25 24H22M7.5 12.62C6.5 12.62 5.62 11.75 5.62 10.62C5.62 9.5 6.5 8.62 7.5 8.62C8.5 8.62 9.38 9.5 9.38 10.62C9.38 11.75 8.5 12.62 7.5 12.62M16.5 12.62C15.5 12.62 14.62 11.75 14.62 10.62C14.62 9.5 15.5 8.62 16.5 8.62C17.5 8.62 18.38 9.5 18.38 10.62C18.38 11.75 17.5 12.62 16.5 12.62Z" />
            </svg>
          </a>
        )}
        {socialLinks.telegram && (
          <a href={socialLinks.telegram} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#0088cc">
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
          </a>
        )}
        {socialLinks.vk && (
          <a href={socialLinks.vk} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#4C75A3">
              <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm.63 15.06h-1.71c-.67 0-.83-.22-1.37-.95-.85-1.13-1.47-1.28-1.71-1.28-.35 0-.46.11-.46.59v1.38c0 .41-.13.65-1.21.65-1.79 0-3.77-1.08-5.16-3.11-2.1-2.96-2.67-5.19-2.67-5.62 0-.32.11-.41.46-.41h1.71c.44 0 .61.13.78.55.85 2.47 2.29 4.64 2.89 4.64.22 0 .32-.11.32-.57v-2.17c-.07-1.03-.5-1.12-5-1.12-.29 0-.32-.11-.32-.41 0-.17.11-.41.22-.62.33-.57 1.03-.76 3.27-.76h.76c1.21 0 1.66.13 1.66 1.26v1.89c0 .41.11.54.18.54.22 0 .41-.13.83-.55.85-1.01 1.47-2.58 1.47-2.58.11-.22.33-.46.78-.46h1.71c.5 0 .61.24.5.57-.2.87-2.27 3.9-2.27 3.9-.17.29-.24.41 0 .71.17.22.76.72 1.13 1.16.72.81 1.24 1.5 1.38 1.97.18.44-.03.67-.5.67z" />
            </svg>
          </a>
        )}
        {socialLinks.yandexMusic && (
          <a href={socialLinks.yandexMusic} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#FFCC00">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
            </svg>
          </a>
        )}
      </div>
    );
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>{twitchData.display_name} | Streamers Universe</title>
        <meta name="description" content={`Профиль ${twitchData.display_name} в Streamers Universe`} />
      </Head>
      
      <div className={styles.profileHeader}>
        <div className={styles.profileAvatar}>
          <Image 
            src={twitchData.profile_image_url || '/images/default-avatar.png'} 
            alt={twitchData.display_name}
            width={100}
            height={100}
            className={styles.avatarImage}
          />
          {isStreamer && (
            <div className={styles.streamerBadge}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
              <span>Стример</span>
            </div>
          )}
        </div>
        
        <div className={styles.profileInfo}>
          <h1 className={styles.displayName}>{twitchData.display_name}</h1>
          <p className={styles.username}>@{twitchData.login}</p>
          
          {twitchData.description && (
            <p className={styles.description}>{twitchData.description}</p>
          )}
          
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{twitchData.follower_count || 0}</span>
              <span className={styles.statLabel}>Фолловеры Twitch</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{twitchData.following_count || 0}</span>
              <span className={styles.statLabel}>Фолловинги Twitch</span>
            </div>
            {isStreamer && (
              <div className={styles.statItem}>
                <span className={styles.statValue}>{twitchData.view_count || 0}</span>
                <span className={styles.statLabel}>Просмотры</span>
              </div>
            )}
          </div>
          
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{userData.subscribersCount || 0}</span>
              <span className={styles.statLabel}>Подписчики SU</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{userData.subscriptionsCount || 0}</span>
              <span className={styles.statLabel}>Подписки SU</span>
            </div>
          </div>
          
          {renderSocialLinks()}
          
          <div className={styles.actionButtons}>
            {isAuthenticated && userData?.twitchData?.id !== userId && (
              <>
                <button 
                  className={styles.actionButton} 
                  onClick={() => setIsQuestionModalOpen(true)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 13.5V13.51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8.5 10.5C8.5 8.84315 10.0669 7.5 12 7.5C13.9331 7.5 15.5 8.84315 15.5 10.5C15.5 11.8038 14.5941 12.9201 13.3127 13.3511C12.7091 13.5428 12 13.9693 12 14.5V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Задать вопрос</span>
                </button>
                
                <button 
                  className={`${styles.actionButton} ${isFollowing ? styles.activeButton : ''}`} 
                  onClick={handleSubscribe}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 12.75L10.5 18.75L19.5 5.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{isFollowing ? 'Отписаться' : 'Подписаться'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className={styles.contentTabs}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'media' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('media')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
          </svg>
          Медиа
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'reviews' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" />
          </svg>
          Отзывы
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'achievements' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zm-2 3V7h2v1c0 1.65-1.35 3-3 3s-3-1.35-3-3V7h2v1c0 .55.45 1 1 1s1-.45 1-1zm-8 0V7h2v1c0 .55.45 1 1 1s1-.45 1-1V7h2v1c0 1.65-1.35 3-3 3s-3-1.35-3-3z" />
          </svg>
          Достижения
        </button>
      </div>
      
      <div className={styles.contentContainer}>
        {activeTab === 'media' && (
          <div className={styles.mediaTab}>
            <h2 className={styles.sectionTitle}>Медиа</h2>
            
            {/* Здесь будет отображаться медиа пользователя */}
            <div className={styles.emptyState}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
              </svg>
              <p>У пользователя пока нет добавленных медиа</p>
              {userId === twitchData.id && (
                <button 
                  className={styles.addButton}
                  onClick={() => router.push('/media/add')}
                >
                  Добавить медиа
                </button>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div className={styles.reviewsTab}>
            <h2 className={styles.sectionTitle}>Отзывы</h2>
            
            {/* Здесь будут отображаться отзывы пользователя */}
            <div className={styles.emptyState}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" />
              </svg>
              <p>У пользователя пока нет отзывов</p>
            </div>
          </div>
        )}
        
        {activeTab === 'achievements' && (
          <div className={styles.achievementsTab}>
            <h2 className={styles.sectionTitle}>Достижения</h2>
            
            {/* Здесь будут отображаться достижения пользователя */}
            <div className={styles.emptyState}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zm-2 3V7h2v1c0 1.65-1.35 3-3 3s-3-1.35-3-3V7h2v1c0 .55.45 1 1 1s1-.45 1-1zm-8 0V7h2v1c0 .55.45 1 1 1s1-.45 1-1V7h2v1c0 1.65-1.35 3-3 3s-3-1.35-3-3z" />
              </svg>
              <p>У пользователя пока нет достижений</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Модальное окно для отправки вопроса */}
      {isQuestionModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Задать вопрос</h3>
            <p>Получатель: {userData?.twitchData?.display_name}</p>
            
            <textarea
              className={styles.messageInput}
              placeholder="Введите ваш вопрос..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
            
            <div className={styles.modalButtons}>
              <button 
                className={styles.cancelButton}
                onClick={() => {
                  setIsQuestionModalOpen(false);
                  setQuestionText('');
                }}
              >
                Отмена
              </button>
              <button 
                className={styles.sendButton}
                onClick={handleSendQuestion}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 