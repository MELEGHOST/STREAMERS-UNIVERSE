import Cookies from 'js-cookie';

export class DataStorage {
  // Сохранение данных
  static async saveData(dataType, dataValue) {
    try {
      // Отправляем данные на сервер
      const response = await fetch('/api/user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataType, dataValue }),
        credentials: 'include', // Важно для отправки cookies
      });
      
      if (!response.ok) {
        console.warn('Не удалось сохранить данные на сервере');
      }
      
      // Также сохраняем в cookies для временного доступа
      // Устанавливаем срок действия - 7 дней
      Cookies.set(`data_${dataType}`, JSON.stringify(dataValue), {
        expires: 7,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      });
      
      return true;
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
      
      // В случае ошибки сохраняем только в cookie
      try {
        Cookies.set(`data_${dataType}`, JSON.stringify(dataValue), {
          expires: 7,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production'
        });
        return true;
      } catch {
        return false;
      }
    }
  }
  
  // Получение данных
  static async getData(dataType) {
    try {
      // Сначала пытаемся получить данные с сервера
      const response = await fetch(`/api/user-data?type=${dataType}`, {
        credentials: 'include',
      });
      
      // Если получили данные с сервера
      if (response.ok) {
        const data = await response.json();
        return data[dataType] || null;
      }
      
      // Если не удалось получить с сервера, проверяем cookies
      const cookieData = Cookies.get(`data_${dataType}`);
      if (cookieData) {
        try {
          return JSON.parse(cookieData);
        } catch {
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при получении данных:', error);
      
      // В случае ошибки пытаемся получить из cookies
      const cookieData = Cookies.get(`data_${dataType}`);
      if (cookieData) {
        try {
          return JSON.parse(cookieData);
        } catch {
          return null;
        }
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