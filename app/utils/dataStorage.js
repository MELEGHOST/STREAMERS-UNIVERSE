import Cookies from 'js-cookie';

// Вспомогательная функция для создания таймаута
const createTimeout = (ms) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
};

// Вспомогательная функция для выполнения запроса с таймаутом
const fetchWithTimeout = async (url, options, timeout = 5000) => {
  // Создаем контроллер для отмены запроса
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Добавляем signal к опциям запроса
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    // Проверяем, была ли ошибка вызвана таймаутом
    if (error.name === 'AbortError') {
      throw new Error(`Запрос к ${url} превысил таймаут ${timeout}мс`);
    }
    throw error;
  } finally {
    // Очищаем таймаут
    clearTimeout(timeoutId);
  }
};

export class DataStorage {
  // Сохранение данных
  static async saveData(dataType, dataValue) {
    try {
      // Преобразуем значение в строку JSON, если оно не строка
      const dataValueString = typeof dataValue === 'string' 
        ? dataValue 
        : JSON.stringify(dataValue);
      
      // Сохраняем в localStorage для надежности
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`data_${dataType}`, dataValueString);
        } catch (localError) {
          console.warn('Не удалось сохранить данные в localStorage:', localError);
        }
      }
      
      // Сохраняем в cookies для временного доступа
      try {
        Cookies.set(`data_${dataType}`, dataValueString, {
          expires: 7,
          sameSite: 'lax',
          path: '/'
        });
      } catch (cookieError) {
        console.warn('Не удалось сохранить данные в cookies:', cookieError);
      }
      
      // Пробуем отправить данные на сервер, но не ждем ответа
      try {
        fetch('/api/user-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dataType, dataValue }),
          credentials: 'include', // Важно для отправки cookies
        }).catch(error => {
          // Только логируем ошибку, но не блокируем основной поток
          console.warn('Не удалось сохранить данные на сервере:', error);
        });
      } catch (serverError) {
        console.warn('Ошибка при отправке данных на сервер:', serverError);
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
      return false;
    }
  }
  
  // Получение данных
  static async getData(dataType) {
    try {
      // Сначала пытаемся получить данные из localStorage
      let data = null;
      
      // Проверяем localStorage
      if (typeof window !== 'undefined') {
        try {
          const localData = localStorage.getItem(`data_${dataType}`);
          if (localData) {
            try {
              data = JSON.parse(localData);
              return data;
            } catch (parseError) {
              console.warn('Ошибка при парсинге данных из localStorage:', parseError);
            }
          }
        } catch (localError) {
          console.warn('Ошибка при получении данных из localStorage:', localError);
        }
      }
      
      // Проверяем cookies
      try {
        const cookieData = Cookies.get(`data_${dataType}`);
        if (cookieData) {
          try {
            data = JSON.parse(cookieData);
            return data;
          } catch (parseError) {
            console.warn('Ошибка при парсинге данных из cookie:', parseError);
          }
        }
      } catch (cookieError) {
        console.warn('Ошибка при получении данных из cookie:', cookieError);
      }
      
      // Если локальные данные не найдены, пытаемся получить с сервера
      try {
        const response = await fetchWithTimeout(`/api/user-data?type=${dataType}`, {
          credentials: 'include',
        }, 3000); // 3 секунды таймаут
        
        if (response.ok) {
          const serverData = await response.json();
          if (serverData && serverData[dataType] !== undefined) {
            // Сохраняем данные с сервера в localStorage и cookies
            await this.saveData(dataType, serverData[dataType]);
            return serverData[dataType];
          }
        }
      } catch (serverError) {
        // Только логируем ошибку, не прерываем выполнение
        console.warn('Не удалось получить данные с сервера:', serverError);
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при получении данных:', error);
      return null;
    }
  }
  
  // Проверка авторизации
  static isAuthenticated() {
    try {
      // Проверяем наличие токена в localStorage
      if (typeof window !== 'undefined') {
        return !!localStorage.getItem('twitch_user') || !!Cookies.get('twitch_user');
      }
      return false;
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
      return false;
    }
  }
  
  // Удаление всех данных
  static async clearAllData() {
    try {
      // Удаляем из localStorage
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith('data_')) {
            localStorage.removeItem(key);
          }
        }
      }
      
      // Удаляем cookies
      const cookies = Cookies.get();
      for (const cookie in cookies) {
        if (cookie.startsWith('data_')) {
          Cookies.remove(cookie, { path: '/' });
        }
      }
      
      // Отправляем запрос на сервер (не ждем ответа)
      fetch('/api/user-data/clear', {
        method: 'POST',
        credentials: 'include',
      }).catch(error => {
        console.warn('Ошибка при очистке данных на сервере:', error);
      });
      
      return true;
    } catch (error) {
      console.error('Ошибка при очистке данных:', error);
      return false;
    }
  }
  
  // Экспорт данных (для миграции)
  static async exportAllData() {
    try {
      const response = await fetch('/api/user-data/export', {
        credentials: 'include',
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // Если сервер недоступен, собираем данные из cookies
      const cookieData = {};
      Object.keys(Cookies.get()).forEach(cookie => {
        if (cookie.startsWith('data_')) {
          const dataType = cookie.replace('data_', '');
          try {
            cookieData[dataType] = JSON.parse(Cookies.get(cookie));
          } catch {
            cookieData[dataType] = null;
          }
        }
      });
      
      return cookieData;
    } catch (error) {
      console.error('Ошибка при экспорте данных:', error);
      return null;
    }
  }
} 