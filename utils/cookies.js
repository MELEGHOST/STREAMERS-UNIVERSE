import Cookies from 'js-cookie';

// Функция для установки куки
export const setCookie = (name, value, options = {}) => {
  try {
    const defaultOptions = {
      path: '/',
      secure: window.location.protocol === 'https:', // Автоматически определяем по протоколу
      sameSite: 'lax',
    };
    
    const cookieOptions = { ...defaultOptions, ...options };
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
        
        document.cookie = `${name}=${encodeURIComponent(value)}; path=${cookieOptions.path}${expires}${maxAge}${secure}${sameSite}`;
        console.log(`Кука ${name} установлена через document.cookie`);
        
        // Сохраняем в localStorage как резервную копию
        localStorage.setItem(`cookie_${name}`, value);
        console.log(`Резервная копия куки ${name} сохранена в localStorage`);
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
    // Сначала пробуем через js-cookie
    let value = Cookies.get(name);
    
    // Если не получилось, пробуем через document.cookie
    if (!value && typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
          value = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    
    console.log(`Получение куки ${name}:`, value ? 'найдена' : 'не найдена');
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
    console.log(`Проверка наличия куки ${name}:`, exists ? 'существует' : 'не существует');
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

// Функция для установки куки с использованием localStorage в качестве резервного варианта
export const setCookieWithLocalStorage = (name, value, options = {}) => {
  try {
    // Сначала пытаемся установить куку
    const cookieSet = setCookie(name, value, options);
    
    // Если не удалось установить куку, используем localStorage
    if (!cookieSet && typeof window !== 'undefined') {
      localStorage.setItem(`cookie_${name}`, value);
      console.log(`Данные ${name} сохранены в localStorage`);
    }
    
    return true;
  } catch (error) {
    console.error(`Ошибка при установке куки/localStorage ${name}:`, error);
    return false;
  }
};

// Функция для получения куки с использованием localStorage в качестве резервного варианта
export const getCookieWithLocalStorage = (name) => {
  try {
    // Сначала пытаемся получить куку
    const cookieValue = getCookie(name);
    
    // Если куки нет, пытаемся получить из localStorage
    if (!cookieValue && typeof window !== 'undefined') {
      // Сначала проверяем прямое соответствие в localStorage
      let localStorageValue = localStorage.getItem(name);
      
      // Если не нашли, проверяем с префиксом cookie_
      if (!localStorageValue) {
        localStorageValue = localStorage.getItem(`cookie_${name}`);
      }
      
      if (localStorageValue) {
        console.log(`Данные ${name} получены из localStorage`);
        
        // Если нашли в localStorage, пытаемся восстановить куку
        try {
          setCookie(name, localStorageValue);
          console.log(`Восстановлена кука ${name} из localStorage`);
        } catch (restoreError) {
          console.error(`Ошибка при восстановлении куки ${name} из localStorage:`, restoreError);
        }
        
        return localStorageValue;
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
        localStorage.setItem(`cookie_${name}`, sessionToken);
        
        return sessionToken;
      }
    }
    
    return cookieValue;
  } catch (error) {
    console.error(`Ошибка при получении куки/localStorage ${name}:`, error);
    return null;
  }
}; 