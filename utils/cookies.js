'use client';

import Cookies from 'js-cookie';

// Проверка доступности localStorage
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Безопасная работа с localStorage
const safeLocalStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
        return localStorage.getItem(key);
      }
      return null;
    } catch (e) {
      console.error(`Ошибка при получении значения из localStorage (${key}):`, e);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
        localStorage.setItem(key, value);
        return true;
      }
      return false;
    } catch (e) {
      console.error(`Ошибка при установке значения в localStorage (${key}):`, e);
      return false;
    }
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
        localStorage.removeItem(key);
        return true;
      }
      return false;
    } catch (e) {
      console.error(`Ошибка при удалении значения из localStorage (${key}):`, e);
      return false;
    }
  }
};

// Функция для установки куки
export const setCookie = (name, value, options = {}) => {
  try {
    if (!value) {
      console.warn(`Попытка установить пустое значение для куки ${name}`);
      return false;
    }
    
    const defaultOptions = {
      path: '/',
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:', // Автоматически определяем по протоколу
      sameSite: 'lax',
      // Для токенов аутентификации используем httpOnly
      httpOnly: name.includes('token') || name.includes('access'),
    };
    
    const cookieOptions = { ...defaultOptions, ...options };
    
    // Уменьшаем логирование в production среде
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Установка куки ${name} с опциями:`, {
        path: cookieOptions.path,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        httpOnly: cookieOptions.httpOnly,
        expires: cookieOptions.expires ? 'установлено' : 'не установлено',
        maxAge: cookieOptions.maxAge || 'не установлено'
      });
    }
    
    try {
      Cookies.set(name, value, cookieOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Кука ${name} успешно установлена`);
      }
      
      // Проверяем, установилась ли кука
      const cookieExists = Cookies.get(name);
      if (!cookieExists) {
        console.warn(`Кука ${name} не была установлена через js-cookie, пробуем альтернативный метод`);
        // Пробуем установить через document.cookie
        try {
          if (typeof document !== 'undefined') {
            const expires = cookieOptions.expires ? `; expires=${cookieOptions.expires}` : '';
            const maxAge = cookieOptions.maxAge ? `; max-age=${cookieOptions.maxAge}` : '';
            const secure = cookieOptions.secure ? '; secure' : '';
            const sameSite = cookieOptions.sameSite ? `; samesite=${cookieOptions.sameSite}` : '';
            const httpOnly = cookieOptions.httpOnly ? '; httpOnly' : '';
            
            document.cookie = `${name}=${encodeURIComponent(value)}; path=${cookieOptions.path}${expires}${maxAge}${secure}${sameSite}${httpOnly}`;
            
            if (process.env.NODE_ENV !== 'production') {
              console.log(`Кука ${name} установлена через document.cookie`);
            }
            
            // Сохраняем в localStorage только нечувствительные данные
            if (!name.includes('token') && !name.includes('access')) {
              safeLocalStorage.setItem(`cookie_${name}`, value);
              
              if (process.env.NODE_ENV !== 'production') {
                console.log(`Резервная копия куки ${name} сохранена в localStorage`);
              }
            }
          }
        } catch (docCookieError) {
          console.error(`Ошибка при установке куки ${name} через document.cookie:`, docCookieError);
        }
      }
    } catch (cookieError) {
      console.error(`Ошибка при установке куки ${name} через js-cookie:`, cookieError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Общая ошибка при установке куки ${name}:`, error);
    return false;
  }
};

// Функция для получения куки
export const getCookie = (name) => {
  try {
    let value;
    
    try {
      value = Cookies.get(name);
    } catch (cookieError) {
      console.error(`Ошибка при получении куки ${name} через js-cookie:`, cookieError);
      
      // Пробуем получить через document.cookie
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith(name + '=')) {
            value = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Получение куки ${name}:`, value ? 'присутствует' : 'отсутствует');
    }
    
    return value;
  } catch (error) {
    console.error(`Общая ошибка при получении куки ${name}:`, error);
    return null;
  }
};

// Функция для удаления куки
export const removeCookie = (name) => {
  try {
    try {
      Cookies.remove(name, { path: '/' });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Кука ${name} успешно удалена через js-cookie`);
      }
    } catch (cookieError) {
      console.error(`Ошибка при удалении куки ${name} через js-cookie:`, cookieError);
      
      // Пробуем удалить через document.cookie, устанавливая дату истечения в прошлое
      if (typeof document !== 'undefined') {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Кука ${name} удалена через document.cookie`);
        }
      }
    }
    
    // Также удаляем из localStorage, если есть
    safeLocalStorage.removeItem(`cookie_${name}`);
    
    return true;
  } catch (error) {
    console.error(`Общая ошибка при удалении куки ${name}:`, error);
    return false;
  }
};

// Функция для проверки наличия куки
export const hasCookie = (name) => {
  try {
    let exists = false;
    
    try {
      exists = !!Cookies.get(name);
    } catch (cookieError) {
      console.error(`Ошибка при проверке наличия куки ${name} через js-cookie:`, cookieError);
      
      // Пробуем проверить через document.cookie
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith(name + '=')) {
            exists = true;
            break;
          }
        }
      }
    }
    
    return exists;
  } catch (error) {
    console.error(`Общая ошибка при проверке наличия куки ${name}:`, error);
    return false;
  }
};

// Функция для установки куки на стороне клиента из данных, полученных от сервера
export const setClientCookiesFromServer = (userData) => {
  try {
    if (userData) {
      try {
        const userDataStr = typeof userData === 'string' ? userData : JSON.stringify(userData);
        setCookie('twitch_user', userDataStr);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('Данные пользователя успешно сохранены в куки на стороне клиента');
        }
        
        return true;
      } catch (e) {
        console.error('Ошибка при сериализации или установке данных пользователя:', e);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Ошибка при установке куки на стороне клиента:', error);
    return false;
  }
};

// Функция для установки куки с резервным копированием в localStorage
export const setCookieWithLocalStorage = (name, value, options = {}) => {
  try {
    // Устанавливаем куку
    const cookieSet = setCookie(name, value, options);
    
    // Сохраняем в localStorage только нечувствительные данные
    if (cookieSet && !name.includes('token') && !name.includes('access')) {
      safeLocalStorage.setItem(`cookie_${name}`, value);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Резервная копия куки ${name} сохранена в localStorage`);
      }
    }
    
    return cookieSet;
  } catch (error) {
    console.error(`Ошибка при установке куки ${name} с резервным копированием:`, error);
    return false;
  }
};

// Функция для получения куки с проверкой в localStorage
export const getCookieWithLocalStorage = (name) => {
  try {
    // Пробуем получить из куки
    let cookieValue = getCookie(name);
    
    // Если не нашли в куках, пробуем получить из localStorage
    if (!cookieValue) {
      const lsValue = safeLocalStorage.getItem(`cookie_${name}`);
      
      if (lsValue) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Кука ${name} получена из localStorage`);
        }
        
        // Восстанавливаем куку из localStorage
        setCookie(name, lsValue);
        cookieValue = lsValue;
      }
    }
    
    // Если не нашли ни в куках, ни в localStorage, но это токен доступа,
    // пробуем получить его из заголовка Authorization
    if (!cookieValue && name === 'twitch_access_token') {
      // Проверяем, есть ли токен в sessionStorage (мог быть сохранен из заголовка)
      const sessionToken = typeof sessionStorage !== 'undefined' ? 
        sessionStorage.getItem('auth_header_token') : null;
        
      if (sessionToken) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Токен доступа получен из sessionStorage (заголовок Authorization)');
        }
        
        // Восстанавливаем куку
        setCookie(name, sessionToken);
        
        return sessionToken;
      }
    }
    
    return cookieValue;
  } catch (error) {
    console.error(`Ошибка при получении куки/localStorage ${name}:`, error);
    return null;
  }
};

// Функция для проверки валидности токена
export const validateToken = async (token) => {
  if (!token) {
    console.warn('Отсутствует токен для проверки');
    return false;
  }
  
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });
    
    if (!response.ok) {
      console.warn('Токен недействителен:', response.status);
      return false;
    }
    
    try {
      const data = await response.json();
      
      // Проверяем наличие необходимых полей в ответе
      if (!data.client_id || !data.login) {
        console.warn('Ответ валидации токена не содержит необходимых полей');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при парсинге JSON ответа от Twitch API:', error);
      return false;
    }
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return false;
  }
};

// Функция для обновления токена
export const refreshToken = async (refreshTokenValue) => {
  if (!refreshTokenValue) return null;
  
  try {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Отсутствуют необходимые параметры для обновления токена');
      return null;
    }
    
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
        client_id: clientId,
        client_secret: clientSecret
      }).toString()
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка обновления токена: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.access_token) {
      // Обновляем куки с новыми токенами
      setCookie('twitch_access_token', data.access_token, {
        path: '/',
        httpOnly: true,
        secure: window.location.protocol === 'https:',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 дней
      });
      
      if (data.refresh_token) {
        setCookie('twitch_refresh_token', data.refresh_token, {
          path: '/',
          httpOnly: true,
          secure: window.location.protocol === 'https:',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 дней
        });
      }
      
      return data.access_token;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
    return null;
  }
};

// Функция для получения данных пользователя из разных источников
export const getUserData = () => {
  try {
    let userData = null;
    
    // Проверяем куки
    const userCookie = getCookie('twitch_user');
    if (userCookie) {
      try {
        userData = JSON.parse(userCookie);
        console.log('Данные пользователя получены из куки');
      } catch (e) {
        console.error('Ошибка при парсинге данных пользователя из куки:', e);
      }
    }
    
    // Если нет в куках, проверяем localStorage
    if (!userData && typeof window !== 'undefined') {
      const userLocalStorage = localStorage.getItem('twitch_user') || localStorage.getItem('cookie_twitch_user');
      if (userLocalStorage) {
        try {
          userData = JSON.parse(userLocalStorage);
          console.log('Данные пользователя получены из localStorage');
          
          // Восстанавливаем куку
          if (userData) {
            setCookie('twitch_user', JSON.stringify(userData), {
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
    
    return userData;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return null;
  }
};

// Функция для проверки авторизации пользователя
export const isAuthenticated = () => {
  try {
    const accessToken = getCookieWithLocalStorage('twitch_access_token');
    const userData = getUserData();
    
    return !!(accessToken && userData);
  } catch (error) {
    console.error('Ошибка при проверке авторизации:', error);
    return false;
  }
}; 