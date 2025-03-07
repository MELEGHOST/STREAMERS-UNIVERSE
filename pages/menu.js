import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import styles from './menu.module.css';

export default function Menu() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);

  useEffect(() => {
    // Проверяем авторизацию
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      router.push('/auth');
      return;
    }

    // Получаем данные пользователя из localStorage
    try {
      const storedUserData = localStorage.getItem('twitch_user');
      if (storedUserData) {
        const parsedData = JSON.parse(storedUserData);
        setUserData(parsedData);
        setIsStreamer(parsedData.isStreamer || false);
      }
    } catch (e) {
      console.error('Ошибка при получении данных пользователя:', e);
    }
  }, [router]);

  const handleMenuItemClick = (path) => {
    router.push(path);
  };

  if (!userData) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.menuContainer}>
      <div className={styles.header}>
        <h1>Streamers Universe</h1>
        {userData && (
          <div className={styles.userInfo}>
            <img 
              src={userData.profileImageUrl || '/default-avatar.png'} 
              alt="Аватар" 
              className={styles.avatar}
            />
            <span>{userData.twitchName || userData.display_name}</span>
          </div>
        )}
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
            <h2>2. Подписки</h2>
            <p>Посмотреть на каких стримеров ты подписан на Twitch/в приложении Streamers Universe</p>
          </div>
        </div>

        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/followers')}
        >
          <div className={styles.menuIcon}>👥</div>
          <div className={styles.menuContent}>
            <h2>3. Подписчики</h2>
            <p>Посмотреть кто подписан на тебя в Streamers Universe</p>
            {isStreamer && (
              <p className={styles.streamerNote}>Как стример, ты можешь назначать роли подписчикам: модератор, доверенный подписчик</p>
            )}
          </div>
        </div>

        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/profile')}
        >
          <div className={styles.menuIcon}>👤</div>
          <div className={styles.menuContent}>
            <h2>4. Профиль</h2>
            <p>Твоя страница профиля</p>
          </div>
        </div>

        <div 
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('/settings')}
        >
          <div className={styles.menuIcon}>⚙️</div>
          <div className={styles.menuContent}>
            <h2>5. Настройки</h2>
            <p>Возможность сменить тему (тёмная/светлая), поменять шрифт, часовой пояс, язык и другие настройки</p>
          </div>
        </div>
      </div>
    </div>
  );
} 