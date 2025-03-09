import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../styles/userProfile.module.css';
import { useAuth } from '../../contexts/AuthContext';

// Стили для новой кнопки подписки
const ctaButtonStyles = `
  .cta {
    position: relative;
    margin: auto;
    padding: 12px 18px;
    transition: all 0.2s ease;
    border: none;
    background: none;
    cursor: pointer;
  }
  
  .cta:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    border-radius: 50px;
    background: #b1dae7;
    width: 45px;
    height: 45px;
    transition: all 0.3s ease;
  }
  
  .cta span {
    position: relative;
    font-family: "Ubuntu", sans-serif;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #234567;
  }
  
  .cta svg {
    position: relative;
    top: 0;
    margin-left: 10px;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke: #234567;
    stroke-width: 2;
    transform: translateX(-5px);
    transition: all 0.3s ease;
  }
  
  .cta:hover:before {
    width: 100%;
    background: #b1dae7;
  }
  
  .cta:hover svg {
    transform: translateX(0);
  }
  
  .cta:active {
    transform: scale(0.95);
  }

  .ctaFollowing {
    background: #ffd1d1;
  }

  .ctaFollowing:before {
    background: #ffd1d1;
  }

  .ctaFollowing span, .ctaFollowing svg {
    color: #e74c3c;
    stroke: #e74c3c;
  }

  .ctaFollowing:hover:before {
    background: #ffd1d1;
  }
`;

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
  
  const [socialLinks, setSocialLinks] = useState(null);
  
  useEffect(() => {
    if (!id) return;
    
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/twitch/user?id=${id}`);
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        
        setUserData(data);
        setIsFollowing(data.isFollowed || false);
        
        // Загружаем социальные ссылки
        if (data.twitchData && data.twitchData.id) {
          await fetchSocialLinks(data.twitchData.id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
        setError('Произошла ошибка при загрузке данных пользователя.');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [id]);
  
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
  
  // Функция для получения социальных ссылок пользователя
  const fetchSocialLinks = async (userId) => {
    try {
      console.log('Получение социальных ссылок для пользователя:', userId);
      
      // Пытаемся получить данные через API
      const response = await fetch(`/api/socials?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Социальные ссылки получены через API:', data);
        setSocialLinks(data);
        return data;
      } else {
        console.warn('API не вернул соц. ссылки, проверяем localStorage');
        
        // Если API недоступен, пробуем localStorage
        if (typeof window !== 'undefined') {
          const cachedData = localStorage.getItem(`social_links_${userId}`);
          if (cachedData) {
            try {
              const parsedData = JSON.parse(cachedData);
              console.log('Социальные ссылки получены из localStorage');
              setSocialLinks(parsedData);
              return parsedData;
            } catch (err) {
              console.error('Ошибка при парсинге данных из localStorage:', err);
            }
          }
        }
      }
      
      // Если данные не получены ни из API, ни из localStorage
      return null;
    } catch (error) {
      console.error('Ошибка при получении социальных ссылок:', error);
      return null;
    }
  };
  
  // Функция для отображения социальных ссылок
  const renderSocialLinks = () => {
    if (!socialLinks) return null;
    
    console.log('Отображение социальных ссылок:', socialLinks);
    
    return (
      <div className={styles.socialIconsContainer}>
        {socialLinks.twitch && (
          <a 
            href={socialLinks.twitch} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.socialLink} 
            aria-label="Twitch"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#9146FF">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
            </svg>
          </a>
        )}
        
        {socialLinks.youtube && (
          <a 
            href={socialLinks.youtube} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.socialLink}
            aria-label="YouTube"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#FF0000">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
        )}
        
        {socialLinks.discord && (
          <a 
            href={socialLinks.discord} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.socialLink}
            aria-label="Discord"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#5865F2">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
          </a>
        )}
        
        {socialLinks.telegram && (
          <a 
            href={socialLinks.telegram} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.socialLink}
            aria-label="Telegram"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#0088cc">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
        )}
        
        {socialLinks.vk && (
          <a 
            href={socialLinks.vk} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.socialLink}
            aria-label="VK"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#4C75A3">
              <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.847 2.387 2.267 4.472 2.845 4.472.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.743c.372 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.15-3.574 2.15-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
            </svg>
          </a>
        )}
        
        {socialLinks.isMusician && socialLinks.yandexMusic && (
          <a 
            href={socialLinks.yandexMusic} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.socialLink}
            aria-label="Yandex Music"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#FFCC00">
              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.784-6.228 6.228S8.568 18.228 12 18.228s6.228-2.784 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.124h1.764v5.724h3.684v1.692H9.684z" />
            </svg>
          </a>
        )}
      </div>
    );
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
  
  const { twitchData, socialLinks: userSocialLinks, isRegisteredInSU } = userData;
  
  // Определяем статус пользователя
  const isStreamer = twitchData.follower_count >= 265;
  
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
                  className={`cta ${isFollowing ? 'ctaFollowing' : ''}`}
                  onClick={handleSubscribe}
                >
                  <span>{isFollowing ? 'Отписаться' : 'Подписаться'}</span>
                  <svg viewBox="0 0 13 10" height="10px" width="15px">
                    <path d={isFollowing ? "M1,5 L11,5" : "M1,5 L11,5 M8,1 L12,5 L8,9"}></path>
                  </svg>
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
      
      {/* Добавляем стили внутрь компонента */}
      <style jsx>{ctaButtonStyles}</style>
    </div>
  );
} 