'use client';

/**
 * Утилиты для работы с Twitch API
 */
import { DataStorage } from './dataStorage';
import Cookies from 'js-cookie';

/**
 * Обновляет токен доступа при его истечении
 * @returns {Promise<string|null>} - Новый токен доступа или null в случае ошибки
 */
export async function refreshAccessToken() {
  try {
    // Получаем refresh_token из всех возможных источников
    const refreshToken = Cookies.get('twitch_refresh_token') || 
                         localStorage.getItem('twitch_refresh_token') || 
                         await DataStorage.getData('refresh_token');
    
    if (!refreshToken) {
      console.error('Отсутствует refresh_token для обновления токена доступа');
      // Очищаем все связанные с токеном данные, так как обновление невозможно
      Cookies.remove('twitch_access_token');
      localStorage.removeItem('cookie_twitch_access_token');
      await DataStorage.removeData('auth_token');
      
      // Перенаправляем на страницу авторизации
      if (typeof window !== 'undefined') {
        // Сохраняем текущий URL для возврата после авторизации
        localStorage.setItem('auth_redirect', window.location.pathname);
        // Перенаправляем на страницу авторизации через небольшую задержку
        setTimeout(() => {
          window.location.href = '/auth';
        }, 100);
      }
      
      return null;
    }
    
    // Добавляем таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-секундный таймаут
    
    const response = await fetch('/api/twitch/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Ошибка при обновлении токена:', await response.text());
      // Если токен недействителен, очищаем все связанные с ним данные
      if (response.status === 401) {
        Cookies.remove('twitch_access_token');
        Cookies.remove('twitch_refresh_token');
        localStorage.removeItem('cookie_twitch_access_token');
        localStorage.removeItem('twitch_refresh_token');
        localStorage.removeItem('twitch_token_expires_at');
        await DataStorage.removeData('auth_token');
        await DataStorage.removeData('refresh_token');
        
        // Перенаправляем на страницу авторизации
        if (typeof window !== 'undefined') {
          // Сохраняем текущий URL для возврата после авторизации
          localStorage.setItem('auth_redirect', window.location.pathname);
          // Перенаправляем на страницу авторизации через небольшую задержку
          setTimeout(() => {
            window.location.href = '/auth';
          }, 100);
        }
      }
      return null;
    }
    
    const data = await response.json();
    
    if (data.access_token) {
      // Сохраняем новый токен в хранилище
      Cookies.set('twitch_access_token', data.access_token, { expires: 7 });
      localStorage.setItem('cookie_twitch_access_token', data.access_token);
      await DataStorage.saveData('auth_token', data.access_token);
      
      // Если есть новый refresh_token, сохраняем и его
      if (data.refresh_token) {
        Cookies.set('twitch_refresh_token', data.refresh_token, { expires: 30 });
        localStorage.setItem('twitch_refresh_token', data.refresh_token);
        await DataStorage.saveData('refresh_token', data.refresh_token);
      } else {
        // Если новый refresh_token не получен, сохраняем старый
        await DataStorage.saveData('refresh_token', refreshToken);
      }
      
      // Сохраняем время истечения токена
      if (data.expires_in) {
        const expiresAt = Date.now() + (data.expires_in * 1000);
        localStorage.setItem('twitch_token_expires_at', expiresAt.toString());
      }
      
      return data.access_token;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при обновлении токена доступа:', error);
    return null;
  }
}

/**
 * Проверяет, истек ли срок действия токена
 * @returns {boolean} - true, если токен истек или скоро истечет
 */
export function isTokenExpired() {
  try {
    const expiresAtStr = localStorage.getItem('twitch_token_expires_at');
    if (!expiresAtStr) return true;
    
    const expiresAt = parseInt(expiresAtStr, 10);
    // Считаем токен истекшим, если до истечения осталось менее 5 минут
    return Date.now() > (expiresAt - 5 * 60 * 1000);
  } catch (error) {
    console.error('Ошибка при проверке срока действия токена:', error);
    return true;
  }
}

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
    // Используем новую функцию fetchWithTokenRefresh
    const data = await fetchWithTokenRefresh(
      `/api/twitch/user-followers?userId=${userId}`,
      {
        method: 'GET',
      },
      true, // Использовать кэш
      'followers', // Ключ для кэширования
      3600000 // Время жизни кэша (1 час)
    );
    
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

/**
 * Получает данные пользователя из хранилища
 * @returns {Promise<Object|null>} - Данные пользователя или null, если данные отсутствуют
 */
export async function getUserData() {
  try {
    // Используем новую функцию fetchWithTokenRefresh
    try {
      const userData = await fetchWithTokenRefresh(
        '/api/twitch/profile',
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        },
        true, // Использовать кэш
        'user', // Ключ для кэширования
        3600000 // Время жизни кэша (1 час)
      );
      
      // Сохраняем данные в localStorage для быстрого доступа в будущем
      if (userData && userData.id) {
        try {
          localStorage.setItem('twitch_user', JSON.stringify(userData));
        } catch (storageError) {
          console.warn('Не удалось сохранить данные пользователя в localStorage:', storageError);
        }
      }
      
      return userData;
    } catch (apiError) {
      console.warn('Ошибка при получении данных из API:', apiError);
      // Продолжаем работу, пытаясь получить данные из хранилища
    }
    
    // Пытаемся получить данные пользователя из нашего хранилища
    const userData = await DataStorage.getData('user');
    if (userData && userData.id) {
      return userData;
    }
    
    // Если нет данных в нашем хранилище, пытаемся получить из старых источников
    const legacyUserData = getUserFromLocalStorage();
    if (legacyUserData && legacyUserData.id) {
      // Сохраняем данные в новое хранилище
      await DataStorage.saveData('user', legacyUserData);
      return legacyUserData;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    
    // В случае общей ошибки, пытаемся вернуть хоть какие-то данные
    try {
      return getUserFromLocalStorage() || null;
    } catch (e) {
      return null;
    }
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
      Cookies.get('twitch_user'),
      Cookies.get('twitch_user_data')
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
    
    // Если нет кэша, проверяем наличие данных пользователя
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
      const hasTwitchUser = Cookies.get('twitch_user') || localStorage.getItem('twitch_user');
      const hasTwitchUserData = Cookies.get('twitch_user_data');
      
      if (!hasTwitchUser && !hasTwitchUserData) {
        console.warn('Токен и данные пользователя не найдены, перенаправляю на страницу авторизации');
        // Сохраняем текущий URL для возврата после авторизации
        localStorage.setItem('auth_redirect', window.location.pathname);
        // Перенаправляем на страницу авторизации через небольшую задержку
        setTimeout(() => {
          window.location.href = '/auth';
        }, 100);
      } else {
        console.log('Токен не найден, но данные пользователя присутствуют. Продолжаю загрузку...');
      }
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
    // Проверяем, что мы находимся на клиенте
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null; // Если нет доступа к window или document, значит мы на сервере
    }
    
    // Сначала пробуем через Cookies API (безопаснее)
    try {
      if (typeof Cookies !== 'undefined') {
        const cookieToken = Cookies.get('twitch_access_token');
        if (cookieToken) return cookieToken;
      }
    } catch (cookieError) {
      console.warn('Ошибка при получении токена через Cookies API:', cookieError);
    }
    
    // Запасной вариант: парсинг document.cookie
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; twitch_access_token=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    } catch (docCookieError) {
      console.warn('Ошибка при парсинге document.cookie:', docCookieError);
    }
    
    // Если ничего не найдено, проверяем localStorage
    try {
      return localStorage.getItem('cookie_twitch_access_token');
    } catch (localStorageError) {
      console.warn('Ошибка при получении токена из localStorage:', localStorageError);
    }
    
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
    // Используем новую функцию fetchWithTokenRefresh
    const data = await fetchWithTokenRefresh(
      `/api/twitch/user-followings?userId=${userId}`,
      {
        method: 'GET',
      },
      true, // Использовать кэш
      'followings', // Ключ для кэширования
      3600000 // Время жизни кэша (1 час)
    );
    
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
    // Используем новую функцию fetchWithTokenRefresh
    const data = await fetchWithTokenRefresh(
      `/api/twitch/user-stats?userId=${userId}`,
      {
        method: 'GET',
      },
      true, // Использовать кэш
      'user_stats', // Ключ для кэширования
      3600000 // Время жизни кэша (1 час)
    );
    
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

/**
 * Выполняет запрос к API с обработкой ошибок и обновлением токена
 * @param {string} url - URL для запроса
 * @param {Object} options - Опции запроса
 * @param {boolean} useCache - Использовать ли кэш
 * @param {string} cacheKey - Ключ для кэширования
 * @param {number} cacheTime - Время жизни кэша в миллисекундах
 * @returns {Promise<Object>} - Результат запроса
 */
export async function fetchWithTokenRefresh(url, options = {}, useCache = false, cacheKey = null, cacheTime = 3600000) {
  try {
    // Проверяем кэш, если нужно
    if (useCache && cacheKey) {
      const cachedData = await DataStorage.getData(cacheKey);
      if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp < cacheTime)) {
        console.log(`Использую кэшированные данные для ${cacheKey}`);
        return cachedData;
      }
    }
    
    // Получаем токен доступа из всех возможных источников
    let accessToken = Cookies.get('twitch_access_token') || 
                     localStorage.getItem('cookie_twitch_access_token') || 
                     await DataStorage.getData('auth_token');
    
    // Проверяем наличие токена
    if (!accessToken) {
      console.warn('Токен доступа не найден, пытаюсь получить из других источников');
      
      // Пытаемся получить токен из других источников
      accessToken = localStorage.getItem('twitch_access_token') || 
                    Cookies.get('access_token') || 
                    await DataStorage.getData('twitch_access_token');
      
      if (accessToken) {
        // Сохраняем найденный токен в основные хранилища
        Cookies.set('twitch_access_token', accessToken, { expires: 7 });
        localStorage.setItem('cookie_twitch_access_token', accessToken);
        await DataStorage.saveData('auth_token', accessToken);
      } else {
        // Если токен не найден, пытаемся использовать кэш
        if (useCache && cacheKey) {
          const cachedData = await DataStorage.getData(cacheKey);
          if (cachedData) {
            console.warn(`Токен не найден, использую кэшированные данные для ${cacheKey}`);
            return cachedData;
          }
        }
        
        // Если нет кэша, перенаправляем на страницу авторизации
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
          console.warn('Токен не найден, перенаправляю на страницу авторизации');
          // Сохраняем текущий URL для возврата после авторизации
          localStorage.setItem('auth_redirect', window.location.pathname);
          // Перенаправляем на страницу авторизации через небольшую задержку
          setTimeout(() => {
            window.location.href = '/auth';
          }, 100);
        }
        
        throw new Error('Токен доступа не найден');
      }
    }
    
    // Проверяем, не истек ли токен
    if (accessToken && isTokenExpired()) {
      console.log('Токен доступа скоро истечет, обновляю...');
      const newToken = await refreshAccessToken();
      if (newToken) {
        accessToken = newToken;
      } else {
        // Если не удалось обновить токен, но есть кэш, используем его
        if (useCache && cacheKey) {
          const cachedData = await DataStorage.getData(cacheKey);
          if (cachedData) {
            console.warn(`Не удалось обновить токен, использую кэшированные данные для ${cacheKey}`);
            return cachedData;
          }
        }
      }
    }
    
    // Добавляем токен в заголовки, если он есть
    const headers = {
      ...options.headers,
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Устанавливаем таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-секундный таймаут
    
    // Выполняем запрос
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Если запрос успешен, возвращаем результат
    if (response.ok) {
      const data = await response.json();
      
      // Сохраняем в кэш, если нужно
      if (useCache && cacheKey) {
        await DataStorage.saveData(cacheKey, {
          ...data,
          timestamp: Date.now()
        });
      }
      
      return data;
    }
    
    // Если токен недействителен, пытаемся обновить его
    if (response.status === 401) {
      console.log('Токен доступа истек, пытаюсь обновить...');
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        // Повторяем запрос с новым токеном
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
        
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`
          },
          credentials: 'include',
          signal: retryController.signal
        });
        
        clearTimeout(retryTimeoutId);
        
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          
          // Сохраняем в кэш, если нужно
          if (useCache && cacheKey) {
            await DataStorage.saveData(cacheKey, {
              ...data,
              timestamp: Date.now()
            });
          }
          
          return data;
        }
      }
    }
    
    // Если запрос не успешен и есть кэш, возвращаем кэш
    if (useCache && cacheKey) {
      const cachedData = await DataStorage.getData(cacheKey);
      if (cachedData) {
        console.warn(`API вернул ошибку (${response.status}), использую кэшированные данные для ${cacheKey}`);
        return cachedData;
      }
    }
    
    // Если нет кэша и запрос не успешен, пытаемся получить текст ошибки
    try {
      const errorText = await response.text();
      throw new Error(`API вернул ошибку: ${response.status} - ${errorText}`);
    } catch (textError) {
      throw new Error(`API вернул ошибку: ${response.status}`);
    }
  } catch (error) {
    console.error(`Ошибка при выполнении запроса к ${url}:`, error);
    
    // Если есть кэш, возвращаем его даже при ошибке сети
    if (useCache && cacheKey) {
      const cachedData = await DataStorage.getData(cacheKey);
      if (cachedData) {
        console.warn(`Ошибка сети, использую кэшированные данные для ${cacheKey}`);
        return cachedData;
      }
    }
    
    // Если нет кэша, пробрасываем ошибку дальше
    throw error;
  }
} 