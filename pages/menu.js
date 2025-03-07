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

  useEffect(() => {
    // Проверяем авторизацию
    try {
      const accessToken = Cookies.get('twitch_access_token');
      if (!accessToken) {
        console.log('Токен доступа отсутствует, перенаправление на страницу авторизации');
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
        } else {
          setError('Данные пользователя не найдены. Пожалуйста, авторизуйтесь снова.');
        }
      } catch (e) {
        console.error('Ошибка при получении данных пользователя:', e);
        setError('Ошибка при загрузке данных пользователя. Пожалуйста, обновите страницу или авторизуйтесь снова.');
      } finally {
        setLoading(false);
      }
    } catch (e) {
      console.error('Ошибка при проверке авторизации:', e);
      setError('Ошибка при проверке авторизации. Пожалуйста, обновите страницу или авторизуйтесь снова.');
      setLoading(false);
    }
  }, [router]);

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
          <span>{userData.twitchName || userData.display_name}</span>
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