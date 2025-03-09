/**
 * Утилиты для работы с Twitch API
 */
import { DataStorage } from './dataStorage';
import Cookies from 'js-cookie';

/**
 * Получает фолловеров пользователя
 * @param {string} userId - ID пользователя в Twitch
 * @param {string} accessToken - Токен доступа к Twitch API
 * @returns {Promise<Object>} - Данные о фолловерах
 */
export async function getUserFollowers(userId, accessToken) {
  if (!userId) {
    console.warn('getUserFollowers: Попытка вызова без userId');
    return { total: 0, followers: [] }; // Возвращаем пустой объект вместо ошибки
  }

  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  if (!clientId) {
    console.warn('getUserFollowers: NEXT_PUBLIC_TWITCH_CLIENT_ID не найден в переменных окружения');
    return { total: 0, followers: [] }; // Возвращаем пустой объект вместо ошибки
  }

  try {
    // Сначала быстро проверяем кэш
    const cachedFollowers = await DataStorage.getData('followers');
    
    // Если есть кэшированные данные, сразу их возвращаем и делаем обновление в фоне
    if (cachedFollowers && cachedFollowers.followers) {
      // Запускаем обновление данных в фоне, если они устарели
      if (!cachedFollowers.timestamp || (Date.now() - cachedFollowers.timestamp > 3600000)) {
        console.log('Кэшированные данные устарели, обновляю в фоне');
        setTimeout(() => {
          refreshFollowersData(userId).catch(e => 
            console.warn('Ошибка при фоновом обновлении данных о фолловерах:', e)
          );
        }, 100);
      }
      
      console.log('Использую кэшированные данные о фолловерах');
      return cachedFollowers;
    }
    
    // Если кэша нет, делаем запрос к API с таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-секундный таймаут
    
    const response = await fetch(`/api/twitch/user-followers?userId=${userId}`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      // В случае ошибки проверяем, есть ли хоть какие-то кэшированные данные
      if (cachedFollowers) {
        console.warn('API вернул ошибку, использую любые доступные кэшированные данные');
        return cachedFollowers;
      }
      
      // Если кэша нет, возвращаем пустой объект вместо ошибки
      console.error('Ошибка при получении фолловеров:', await response.text());
      return { total: 0, followers: [] };
    }

    const data = await response.json();
    
    // Сохраняем в нашем хранилище с меткой времени
    await DataStorage.saveData('followers', {
      ...data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении фолловеров:', error);
    
    // В случае ошибки пытаемся использовать кэшированные данные
    const cachedFollowers = await DataStorage.getData('followers');
    if (cachedFollowers) {
      console.warn('Произошла ошибка, использую кэшированные данные о фолловерах');
      return cachedFollowers;
    }
    
    // Если кэша нет, возвращаем пустой объект вместо ошибки
    return { total: 0, followers: [] };
  }
}

// Вспомогательная функция для обновления данных о фолловерах в фоне
async function refreshFollowersData(userId) {
  try {
    const response = await fetch(`/api/twitch/user-followers?userId=${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ошибка: ${response.status}`);
    }

    const data = await response.json();
    
    // Обновляем кэш с новыми данными
    await DataStorage.saveData('followers', {
      ...data,
      timestamp: Date.now()
    });
    
    console.log('Фоновое обновление данных о фолловерах завершено успешно');
    return data;
  } catch (error) {
    console.error('Ошибка при фоновом обновлении данных о фолловерах:', error);
    throw error;
  }
}

/**
 * Получает данные пользователя из хранилища
 * @returns {Promise<Object|null>} - Данные пользователя или null, если данные отсутствуют
 */
export async function getUserData() {
  try {
    // Пытаемся получить данные пользователя из нашего хранилища
    const userData = await DataStorage.getData('user');
    if (userData) {
      return userData;
    }
    
    // Если нет данных в нашем хранилище, пытаемся получить из старых источников
    // и сохранить в новое хранилище
    const legacyUserData = getUserFromLocalStorage();
    if (legacyUserData) {
      // Сохраняем данные в новое хранилище
      await DataStorage.saveData('user', legacyUserData);
      return legacyUserData;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return null;
  }
}

/**
 * Получает данные пользователя из localStorage (устаревший метод)
 * @returns {Object|null} - Данные пользователя или null, если данные отсутствуют
 */
export function getUserFromLocalStorage() {
  try {
    // Проверяем несколько возможных источников данных
    const sources = [
      localStorage.getItem('twitch_user'),
      localStorage.getItem('cookie_twitch_user'),
      Cookies.get('twitch_user')
    ];
    
    // Перебираем источники и возвращаем первый непустой результат
    for (const source of sources) {
      if (source) {
        try {
          const parsed = typeof source === 'string' ? JSON.parse(source) : source;
          if (parsed && parsed.id) {
            return parsed;
          }
        } catch (e) {
          console.warn('Ошибка при парсинге данных пользователя:', e);
          // Продолжаем проверку других источников
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя из хранилища:', error);
    return null;
  }
}

/**
 * Получает токен доступа из наших хранилищ
 * @returns {Promise<string|null>} - Токен доступа или null, если токен отсутствует
 */
export async function getAccessToken() {
  try {
    // Сначала проверяем наш новый токен
    const authToken = await DataStorage.getData('auth_token');
    if (authToken) {
      return authToken;
    }
    
    // Если нет, проверяем старые источники
    if (typeof document === 'undefined') return null; // Проверка, что выполняется на клиенте
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; twitch_access_token=`);
    if (parts.length === 2) {
      const token = parts.pop().split(';').shift();
      
      // Сохраняем в новое хранилище
      if (token) {
        await DataStorage.saveData('auth_token', token);
      }
      
      return token;
    }
    
    // Наконец, проверяем localStorage
    const localToken = localStorage.getItem('cookie_twitch_access_token');
    if (localToken) {
      // Сохраняем в новое хранилище
      await DataStorage.saveData('auth_token', localToken);
      return localToken;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при получении токена доступа:', error);
    return null;
  }
}

/**
 * Получает токен доступа из cookie (устаревший метод)
 * @returns {string|null} - Токен доступа или null, если токен отсутствует
 */
export function getAccessTokenFromCookie() {
  try {
    if (typeof document === 'undefined') return null; // Проверка, что выполняется на клиенте
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; twitch_access_token=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  } catch (error) {
    console.error('Ошибка при получении токена доступа из cookie:', error);
    return null;
  }
}

/**
 * Сохраняет данные в нашем хранилище
 * @param {string} key - Ключ для сохранения
 * @param {any} value - Значение для сохранения
 * @returns {Promise<boolean>} - true, если сохранение прошло успешно, иначе false
 */
export async function saveData(key, value) {
  return await DataStorage.saveData(key, value);
}

/**
 * Получает данные о каналах, на которые подписан пользователь (фолловинги)
 * @param {string} userId - ID пользователя в Twitch
 * @returns {Promise<Object>} - Данные о фолловингах
 */
export async function getUserFollowings(userId) {
  if (!userId) {
    throw new Error('Необходим userId');
  }

  try {
    // Попытка получить данные из нашего хранилища
    const cachedFollowings = await DataStorage.getData('followings');
    
    if (cachedFollowings && cachedFollowings.timestamp && 
        (Date.now() - cachedFollowings.timestamp < 3600000)) { // Данные не старше 1 часа
      console.log('Использую кэшированные данные о фолловингах');
      return cachedFollowings;
    }
    
    // Если нет кэшированных данных или они устарели, делаем запрос к API
    const response = await fetch(`/api/twitch/user-followings?userId=${userId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Если есть кэшированные данные, возвращаем их, даже если они устарели
      if (cachedFollowings) {
        console.warn('API вернул ошибку, использую устаревшие кэшированные данные');
        return cachedFollowings;
      }
      
      throw new Error(errorData.error || `HTTP ошибка: ${response.status}`);
    }

    const data = await response.json();
    
    // Сохраняем в нашем хранилище с меткой времени
    await DataStorage.saveData('followings', {
      ...data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении фолловингов:', error);
    
    // В случае ошибки пытаемся использовать кэшированные данные
    const cachedFollowings = await DataStorage.getData('followings');
    if (cachedFollowings) {
      console.warn('Произошла ошибка, использую кэшированные данные о фолловингах');
      return cachedFollowings;
    }
    
    throw error;
  }
}

/**
 * Определяет статус стримера на основе данных пользователя
 * @param {Object} userData - Данные пользователя
 * @returns {boolean} - true, если пользователь является стримером
 */
export function isStreamer(userData) {
  if (!userData) return false;
  
  // Проверяем различные поля, которые могут указывать на статус стримера
  const isPartnerOrAffiliate = 
    userData.broadcaster_type === 'partner' || 
    userData.broadcaster_type === 'affiliate';
  
  const hasFollowers = 
    userData.follower_count && userData.follower_count >= 50;
    
  const hasStreamerBadge =
    userData.badges && 
    (userData.badges.includes('partner') || 
     userData.badges.includes('affiliate') ||
     userData.badges.includes('broadcaster'));
     
  // Определяем статус стримера по комбинации параметров
  return isPartnerOrAffiliate || hasFollowers || hasStreamerBadge;
}

/**
 * Получает статистику пользователя
 * @param {string} userId - ID пользователя в Twitch
 * @returns {Promise<Object>} - Статистика пользователя
 */
export async function getUserStats(userId) {
  if (!userId) {
    throw new Error('Необходим userId');
  }

  try {
    // Попытка получить данные из нашего хранилища
    const cachedStats = await DataStorage.getData('user_stats');
    
    if (cachedStats && cachedStats.timestamp && 
        (Date.now() - cachedStats.timestamp < 3600000)) { // Данные не старше 1 часа
      console.log('Использую кэшированные данные о статистике пользователя');
      return cachedStats;
    }
    
    // Если нет кэшированных данных или они устарели, делаем запрос к API
    const response = await fetch(`/api/twitch/user-stats?userId=${userId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Если есть кэшированные данные, возвращаем их, даже если они устарели
      if (cachedStats) {
        console.warn('API вернул ошибку, использую устаревшие кэшированные данные');
        return cachedStats;
      }
      
      throw new Error(errorData.error || `HTTP ошибка: ${response.status}`);
    }

    const data = await response.json();
    
    // Сохраняем в нашем хранилище с меткой времени
    await DataStorage.saveData('user_stats', {
      ...data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении статистики пользователя:', error);
    
    // В случае ошибки пытаемся использовать кэшированные данные
    const cachedStats = await DataStorage.getData('user_stats');
    if (cachedStats) {
      console.warn('Использую кэшированные данные о статистике пользователя из-за ошибки');
      return cachedStats;
    }
    
    // Если нет кэшированных данных, возвращаем базовую структуру
    return {
      user: {
        viewCount: 0,
        createdAt: new Date().toISOString(),
        broadcasterType: ''
      },
      followers: {
        total: 0,
        recentFollowers: []
      },
      followings: {
        total: 0,
        recentFollowings: []
      },
      stream: {
        isLive: false,
        currentStream: null,
        lastStream: null,
        recentStreams: []
      },
      channel: {
        hasSubscriptionProgram: false,
        subscribers: 0
      }
    };
  }
} 