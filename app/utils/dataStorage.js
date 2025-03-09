import Cookies from 'js-cookie';

// Вспомогательная функция для создания таймаута
const createTimeout = (ms) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
};

// Вспомогательная функция для выполнения запроса с таймаутом
const fetchWithTimeout = async (url, options, timeout = 5000) => {
  return Promise.race([
    fetch(url, options),
    createTimeout(timeout)
  ]);
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
      // Устанавливаем срок действия - 7 дней
      try {
        Cookies.set(`data_${dataType}`, dataValueString, {
          expires: 7,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production'
        });
      } catch (cookieError) {
        console.warn('Не удалось сохранить данные в cookies:', cookieError);
      }
      
      // Отправляем данные на сервер
      try {
        const response = await fetchWithTimeout('/api/user-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dataType, dataValue }),
          credentials: 'include', // Важно для отправки cookies
        }, 5000); // 5 секунд таймаут
        
        if (!response.ok) {
          console.warn('Не удалось сохранить данные на сервере:', await response.text());
        }
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
      // Сначала пытаемся получить данные с сервера
      try {
        const response = await fetchWithTimeout(`/api/user-data?type=${dataType}`, {
          credentials: 'include',
        }, 3000); // 3 секунды таймаут
        
        // Если получили данные с сервера
        if (response.ok) {
          const data = await response.json();
          if (data && data[dataType] !== undefined) {
            return data[dataType];
          }
        }
      } catch (serverError) {
        console.warn('Не удалось получить данные с сервера:', serverError);
        // Продолжаем выполнение и пробуем получить данные из cookies
      }
      
      // Если не удалось получить с сервера, проверяем cookies
      const cookieData = Cookies.get(`data_${dataType}`);
      if (cookieData) {
        try {
          return JSON.parse(cookieData);
        } catch (parseError) {
          console.warn('Ошибка при парсинге данных из cookie:', parseError);
          return null;
        }
      }
      
      // Если данных нет в cookies, проверяем localStorage
      if (typeof window !== 'undefined') {
        const localData = localStorage.getItem(`data_${dataType}`);
        if (localData) {
          try {
            return JSON.parse(localData);
          } catch (parseError) {
            console.warn('Ошибка при парсинге данных из localStorage:', parseError);
            return null;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при получении данных:', error);
      
      // В случае ошибки пытаемся получить из cookies
      try {
        const cookieData = Cookies.get(`data_${dataType}`);
        if (cookieData) {
          return JSON.parse(cookieData);
        }
      } catch (cookieError) {
        console.warn('Ошибка при получении данных из cookie:', cookieError);
      }
      
      // Если не удалось получить из cookies, пробуем localStorage
      try {
        if (typeof window !== 'undefined') {
          const localData = localStorage.getItem(`data_${dataType}`);
          if (localData) {
            return JSON.parse(localData);
          }
        }
      } catch (localError) {
        console.warn('Ошибка при получении данных из localStorage:', localError);
      }
      
      return null;
    }
  }
  
  // Проверка авторизации
  static isAuthenticated() {
    return !!Cookies.get('auth_token');
  }
  
  // Удаление всех данных
  static async clearAllData() {
    try {
      // Удаляем с сервера
      await fetch('/api/user-data/clear', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Удаляем все cookies с префиксом data_
      Object.keys(Cookies.get()).forEach(cookie => {
        if (cookie.startsWith('data_')) {
          Cookies.remove(cookie);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Ошибка при очистке данных:', error);
      
      // Даже если сервер недоступен, очищаем локальные cookies
      Object.keys(Cookies.get()).forEach(cookie => {
        if (cookie.startsWith('data_')) {
          Cookies.remove(cookie);
        }
      });
      
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