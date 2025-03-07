import Cookies from 'js-cookie';

// Функция для установки куки
export const setCookie = (name, value, options = {}) => {
  try {
    if (!value) {
      console.warn(`Попытка установить пустое значение для куки ${name}`);
      return false;
    }
    
    const defaultOptions = {
      path: '/',
      secure: window.location.protocol === 'https:', // Автоматически определяем по протоколу
      sameSite: 'lax',
      // Для токенов аутентификации используем httpOnly
      httpOnly: name.includes('token') || name.includes('access'),
    };
    
    const cookieOptions = { ...defaultOptions, ...options };
    
    // Логируем установку куки
    console.log(`Установка куки ${name} с опциями:`, {
      path: cookieOptions.path,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      httpOnly: cookieOptions.httpOnly,
      expires: cookieOptions.expires ? 'установлено' : 'не установлено',
      maxAge: cookieOptions.maxAge || 'не установлено'
    });
    
    Cookies.set(name, value, cookieOptions);
    console.log(`Кука ${name} успешно установлена`);
    
    // Проверяем, установилась ли кука
    const cookieExists = Cookies.get(name);
    if (!cookieExists) {
      console.warn(`Кука ${name} не была установлена, пробуем альтернативный метод`);
      // Пробуем установить через document.cookie
      try {
        const expires = cookieOptions.expires ? `; expires=${cookieOptions.expires}` : '';
        const maxAge = cookieOptions.maxAge ? `; max-age=${cookieOptions.maxAge}` : '';
        const secure = cookieOptions.secure ? '; secure' : '';
        const sameSite = cookieOptions.sameSite ? `; samesite=${cookieOptions.sameSite}` : '';
        const httpOnly = cookieOptions.httpOnly ? '; httpOnly' : '';
        
        document.cookie = `${name}=${encodeURIComponent(value)}; path=${cookieOptions.path}${expires}${maxAge}${secure}${sameSite}${httpOnly}`;
        console.log(`Кука ${name} установлена через document.cookie`);
        
        // Сохраняем в localStorage только нечувствительные данные
        if (!name.includes('token') && !name.includes('access')) {
          localStorage.setItem(`cookie_${name}`, value);
          console.log(`Резервная копия куки ${name} сохранена в localStorage`);
        }
      } catch (docCookieError) {
        console.error(`Ошибка при установке куки ${name} через document.cookie:`, docCookieError);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Ошибка при установке куки ${name}:`, error);
    return false;
  }
};

// Функция для получения куки
export const getCookie = (name) => {
  try {
    const value = Cookies.get(name);
    console.log(`Получение куки ${name}:`, value ? 'присутствует' : 'отсутствует');
    return value;
  } catch (error) {
    console.error(`Ошибка при получении куки ${name}:`, error);
    return null;
  }
};

// Функция для удаления куки
export const removeCookie = (name) => {
  try {
    Cookies.remove(name, { path: '/' });
    console.log(`Кука ${name} успешно удалена`);
    
    // Также удаляем из localStorage, если есть
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`cookie_${name}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Ошибка при удалении куки ${name}:`, error);
    return false;
  }
};

// Функция для проверки наличия куки
export const hasCookie = (name) => {
  try {
    const exists = !!Cookies.get(name);
    return exists;
  } catch (error) {
    console.error(`Ошибка при проверке наличия куки ${name}:`, error);
    return false;
  }
};

// Функция для установки куки на стороне клиента из данных, полученных от сервера
export const setClientCookiesFromServer = (userData) => {
  try {
    if (userData) {
      setCookie('twitch_user', JSON.stringify(userData));
      console.log('Данные пользователя успешно сохранены в куки на стороне клиента');
      return true;
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
    if (cookieSet && !name.includes('token') && !name.includes('access') && typeof window !== 'undefined') {
      localStorage.setItem(`cookie_${name}`, value);
      console.log(`Резервная копия куки ${name} сохранена в localStorage`);
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
    if (!cookieValue && typeof window !== 'undefined') {
      cookieValue = localStorage.getItem(`cookie_${name}`);
      
      if (cookieValue) {
        console.log(`Кука ${name} получена из localStorage`);
        
        // Восстанавливаем куку из localStorage
        setCookie(name, cookieValue);
      }
    }
    
    // Если не нашли ни в куках, ни в localStorage, но это токен доступа,
    // пробуем получить его из заголовка Authorization
    if (!cookieValue && name === 'twitch_access_token' && typeof window !== 'undefined') {
      // Проверяем, есть ли токен в sessionStorage (мог быть сохранен из заголовка)
      const sessionToken = sessionStorage.getItem('auth_header_token');
      if (sessionToken) {
        console.log('Токен доступа получен из sessionStorage (заголовок Authorization)');
        
        // Восстанавливаем куку и localStorage
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
  if (!token) return false;
  
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });
    
    return response.ok;
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