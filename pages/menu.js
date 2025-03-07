import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import styles from './menu.module.css';

export default function Menu() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamCoins, setStreamCoins] = useState(0);

  useEffect(() => {
    // Проверяем авторизацию
    try {
      // Получаем токен доступа из куки или localStorage
      const accessToken = Cookies.get('twitch_access_token') || localStorage.getItem('cookie_twitch_access_token');
      if (!accessToken) {
        console.log('Токен доступа отсутствует, перенаправление на страницу авторизации');
        router.push('/auth');
        return;
      }

      // Получаем данные пользователя из куки или localStorage
      let userDataObj = null;
      
      // Проверяем куки
      const userCookie = Cookies.get('twitch_user');
      if (userCookie) {
        try {
          userDataObj = JSON.parse(userCookie);
          console.log('Данные пользователя получены из куки');
        } catch (e) {
          console.error('Ошибка при парсинге данных пользователя из куки:', e);
        }
      }
      
      // Если нет в куках, проверяем localStorage
      if (!userDataObj) {
        const userLocalStorage = localStorage.getItem('twitch_user') || localStorage.getItem('cookie_twitch_user');
        if (userLocalStorage) {
          try {
            userDataObj = JSON.parse(userLocalStorage);
            console.log('Данные пользователя получены из localStorage');
            
            // Восстанавливаем куку
            if (userDataObj) {
              Cookies.set('twitch_user', JSON.stringify(userDataObj), {
                path: '/',
                secure: window.location.protocol === 'https:',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 дней
              });
              console.log('Восстановлена кука с данными пользователя из localStorage');
            }
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя из localStorage:', e);
          }
        }
      }
      
      if (userDataObj) {
        // Обрабатываем разные форматы данных пользователя
        const displayName = userDataObj.twitchName || userDataObj.display_name;
        const profileImageUrl = userDataObj.profileImageUrl || userDataObj.profile_image_url;
        
        // Устанавливаем данные пользователя
        setUserData({
          ...userDataObj,
          display_name: displayName,
          profileImageUrl: profileImageUrl
        });
        
        setIsStreamer(userDataObj.isStreamer || false);
        
        // Загружаем стример-коины пользователя
        loadStreamCoins(userDataObj.id);
        
        setLoading(false);
      } else {
        // Если данные пользователя не найдены, пробуем получить их из API
        console.log('Данные пользователя не найдены, пробуем получить из API');
        
        fetch('/api/twitch/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Не удалось получить данные профиля');
        })
        .then(data => {
          console.log('Данные профиля получены из API:', data);
          
          // Создаем объект с данными пользователя
          const userData = {
            id: data.id,
            login: data.login || data.twitchName.toLowerCase(),
            display_name: data.twitchName,
            profileImageUrl: data.profileImageUrl,
            isStreamer: data.isStreamer
          };
          
          // Сохраняем данные пользователя в localStorage и куки
          localStorage.setItem('twitch_user', JSON.stringify(userData));
          Cookies.set('twitch_user', JSON.stringify(userData), {
            path: '/',
            secure: window.location.protocol === 'https:',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 дней
          });
          
          setUserData(userData);
          setIsStreamer(data.isStreamer || false);
          
          // Загружаем стример-коины пользователя
          loadStreamCoins(data.id);
          
          setLoading(false);
        })
        .catch(error => {
          console.error('Ошибка при получении данных профиля:', error);
          setError('Не удалось получить данные профиля. Пожалуйста, попробуйте еще раз.');
          setLoading(false);
        });
      }
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
      setError('Произошла ошибка при проверке авторизации. Пожалуйста, попробуйте еще раз.');
      setLoading(false);
    }
  }, [router]);
  
  // Функция для загрузки стример-коинов пользователя
  const loadStreamCoins = (userId) => {
    try {
      // Проверяем наличие данных о коинах в localStorage
      const coinsData = localStorage.getItem(`streamcoins_${userId}`);
      if (coinsData) {
        try {
          const parsedData = JSON.parse(coinsData);
          setStreamCoins(parsedData.balance || 0);
        } catch (e) {
          console.error('Ошибка при парсинге данных о коинах:', e);
          setStreamCoins(0);
        }
      } else {
        // Если данных нет, устанавливаем начальное значение
        const initialCoins = 100; // Начальное количество коинов для новых пользователей
        setStreamCoins(initialCoins);
        
        // Сохраняем начальные данные в localStorage
        const initialData = {
          userId: userId,
          balance: initialCoins,
          totalEarned: initialCoins,
          totalSpent: 0,
          transactions: [{
            id: `init-${Date.now()}`,
            type: 'earn',
            amount: initialCoins,
            reason: 'initial',
            timestamp: new Date().toISOString(),
            metadata: { note: 'Начальные коины при регистрации' }
          }],
          lastAdWatch: new Date(0).toISOString(),
          referralCode: generateReferralCode(userId),
          referredBy: null
        };
        
        localStorage.setItem(`streamcoins_${userId}`, JSON.stringify(initialData));
      }
    } catch (error) {
      console.error('Ошибка при загрузке стример-коинов:', error);
      setStreamCoins(0);
    }
  };
  
  // Функция для генерации реферального кода
  const generateReferralCode = (userId) => {
    const base = userId.substring(0, 5);
    const randomPart = Math.random().toString(36).substring(2, 6);
    return `${base}-${randomPart}`.toUpperCase();
  };

  const handleMenuItemClick = (path) => {
    try {
      router.push(path);
    } catch (e) {
      console.error('Ошибка при переходе на страницу:', path, e);
      alert(`Ошибка при переходе на страницу ${path}. Пожалуйста, попробуйте еще раз.`);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button className={styles.button} onClick={() => router.push('/auth')}>
          Вернуться на страницу авторизации
        </button>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className={styles.error}>
        <p>Не удалось загрузить данные пользователя</p>
        <button className={styles.button} onClick={() => router.push('/auth')}>
          Вернуться на страницу авторизации
        </button>
      </div>
    );
  }

  return (
    <div className={styles.menuContainer}>
      <div className={styles.header}>
        <h1>Streamers Universe</h1>
        <div className={styles.userInfo}>
          <img 
            src={userData.profileImageUrl} 
            alt={`${userData.twitchName || userData.display_name} аватар`} 
            className={styles.avatar}
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%237B41C9"%3E%3C/rect%3E%3Ctext x="100" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
            }}
          />
          <div className={styles.userDetails}>
            <span>{userData.twitchName || userData.display_name}</span>
            <div className={styles.coinsContainer}>
              <img 
                src="/images/stream-coin.svg" 
                alt="Stream Coins" 
                className={styles.coinIcon} 
              />
              <span className={styles.coinsAmount}>{streamCoins}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.menuItems}>
        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/search')}
        >
          <div className={styles.menuIcon}>🔍</div>
          <div className={styles.menuContent}>
            <h2>1. Поиск</h2>
            <p>Найти другого пользователя по никнейму с Twitch, проверить зарегистрирован ли он, сколько у него фолловеров, на каких общих стримеров вы подписаны</p>
          </div>
        </div>

        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/subscriptions')}
        >
          <div className={styles.menuIcon}>📋</div>
          <div className={styles.menuContent}>
            <h2>2. Фолловинги Twitch</h2>
            <p>Посмотреть на каких стримеров вы подписаны на Twitch (фолловите)</p>
          </div>
        </div>

        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/followers')}
        >
          <div className={styles.menuIcon}>👥</div>
          <div className={styles.menuContent}>
            <h2>3. Фолловеры Twitch</h2>
            <p>Посмотреть кто подписан на вас на Twitch (фолловеры)</p>
            {isStreamer && (
              <p className={styles.streamerNote}>Как стример, вы можете назначать роли фолловерам: модератор, VIP, постоянный зритель</p>
            )}
          </div>
        </div>
        
        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/su-subscriptions')}
        >
          <div className={styles.menuIcon}>🌟</div>
          <div className={styles.menuContent}>
            <h2>4. Подписки в Streamers Universe</h2>
            <p>Посмотреть на каких создателей контента вы подписаны в Streamers Universe</p>
          </div>
        </div>

        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/su-subscribers')}
        >
          <div className={styles.menuIcon}>🎭</div>
          <div className={styles.menuContent}>
            <h2>5. Подписчики в Streamers Universe</h2>
            <p>Посмотреть кто подписан на вас в Streamers Universe</p>
          </div>
        </div>

        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/profile')}
        >
          <div className={styles.menuIcon}>👤</div>
          <div className={styles.menuContent}>
            <h2>6. Профиль</h2>
            <p>Ваша страница профиля</p>
          </div>
        </div>

        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/settings')}
        >
          <div className={styles.menuIcon}>⚙️</div>
          <div className={styles.menuContent}>
            <h2>7. Настройки</h2>
            <p>Возможность сменить тему (тёмная/светлая), поменять шрифт, часовой пояс, язык и другие настройки</p>
          </div>
        </div>
      </div>
    </div>
  );
} 