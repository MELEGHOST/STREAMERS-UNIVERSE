'use client';

import Cookies from 'js-cookie';

// Вспомогательная функция для создания таймаута
const createTimeout = (ms) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
};

// Вспомогательная функция для выполнения запроса с таймаутом
const fetchWithTimeout = async (url, options, timeout = 5000) => {
  // Проверяем, работаем ли в браузере
  if (typeof window === 'undefined') {
    throw new Error('Fetch not available on server');
  }
  
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

/**
 * Утилиты для работы с хранилищем данных
 * Поддерживает localStorage, sessionStorage и IndexedDB
 */

// Префикс для ключей в хранилище
const STORAGE_PREFIX = 'su_';

// Имя базы данных IndexedDB
const DB_NAME = 'streamers-universe-db';
const DB_VERSION = 1;
const STORE_NAME = 'data-store';

/**
 * Класс для работы с хранилищем данных
 */
export class DataStorage {
  /**
   * Сохраняет данные в хранилище
   * @param {string} key - Ключ для сохранения
   * @param {any} data - Данные для сохранения
   * @param {boolean} useSession - Использовать sessionStorage вместо localStorage
   * @returns {Promise<boolean>} - Результат операции
   */
  static async saveData(key, data, useSession = false) {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    
    try {
      // Сначала пытаемся использовать IndexedDB
      const idbResult = await this._saveToIndexedDB(prefixedKey, data);
      if (idbResult) return true;
      
      // Если IndexedDB не доступен, используем localStorage/sessionStorage
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem(prefixedKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn(`Ошибка при сохранении данных для ключа ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Получает данные из хранилища
   * @param {string} key - Ключ для получения данных
   * @returns {Promise<any>} - Полученные данные или null
   */
  static async getData(key) {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    
    try {
      // Сначала пытаемся получить из IndexedDB
      const idbData = await this._getFromIndexedDB(prefixedKey);
      if (idbData !== null) return idbData;
      
      // Если данных нет в IndexedDB, пробуем localStorage
      const localData = localStorage.getItem(prefixedKey);
      if (localData) return JSON.parse(localData);
      
      // Если данных нет в localStorage, пробуем sessionStorage
      const sessionData = sessionStorage.getItem(prefixedKey);
      if (sessionData) return JSON.parse(sessionData);
      
      return null;
    } catch (error) {
      console.warn(`Ошибка при получении данных для ключа ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Удаляет данные из хранилища
   * @param {string} key - Ключ для удаления
   * @returns {Promise<boolean>} - Результат операции
   */
  static async removeData(key) {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    
    try {
      // Удаляем из всех хранилищ
      await this._removeFromIndexedDB(prefixedKey);
      localStorage.removeItem(prefixedKey);
      sessionStorage.removeItem(prefixedKey);
      return true;
    } catch (error) {
      console.warn(`Ошибка при удалении данных для ключа ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Очищает все данные из хранилища
   * @returns {Promise<boolean>} - Результат операции
   */
  static async clearAll() {
    try {
      // Очищаем IndexedDB
      await this._clearIndexedDB();
      
      // Очищаем только наши данные из localStorage и sessionStorage
      this._clearPrefixedStorage(localStorage);
      this._clearPrefixedStorage(sessionStorage);
      
      return true;
    } catch (error) {
      console.warn('Ошибка при очистке хранилища:', error);
      return false;
    }
  }
  
  /**
   * Сохраняет данные в IndexedDB
   * @param {string} key - Ключ для сохранения
   * @param {any} data - Данные для сохранения
   * @returns {Promise<boolean>} - Результат операции
   * @private
   */
  static async _saveToIndexedDB(key, data) {
    if (!window.indexedDB) return false;
    
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        
        request.onerror = () => {
          console.warn('Ошибка при открытии IndexedDB');
          resolve(false);
        };
        
        request.onsuccess = (event) => {
          try {
            const db = event.target.result;
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const storeRequest = store.put({ key, value: data });
            
            storeRequest.onerror = () => {
              console.warn('Ошибка при сохранении в IndexedDB');
              resolve(false);
            };
            
            storeRequest.onsuccess = () => {
              resolve(true);
            };
          } catch (error) {
            console.warn('Ошибка при работе с IndexedDB:', error);
            resolve(false);
          }
        };
      } catch (error) {
        console.warn('Ошибка при инициализации IndexedDB:', error);
        resolve(false);
      }
    });
  }
  
  /**
   * Получает данные из IndexedDB
   * @param {string} key - Ключ для получения данных
   * @returns {Promise<any>} - Полученные данные или null
   * @private
   */
  static async _getFromIndexedDB(key) {
    if (!window.indexedDB) return null;
    
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        
        request.onerror = () => {
          console.warn('Ошибка при открытии IndexedDB');
          resolve(null);
        };
        
        request.onsuccess = (event) => {
          try {
            const db = event.target.result;
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            const storeRequest = store.get(key);
            
            storeRequest.onerror = () => {
              console.warn('Ошибка при получении из IndexedDB');
              resolve(null);
            };
            
            storeRequest.onsuccess = () => {
              if (storeRequest.result) {
                resolve(storeRequest.result.value);
              } else {
                resolve(null);
              }
            };
          } catch (error) {
            console.warn('Ошибка при работе с IndexedDB:', error);
            resolve(null);
          }
        };
      } catch (error) {
        console.warn('Ошибка при инициализации IndexedDB:', error);
        resolve(null);
      }
    });
  }
  
  /**
   * Удаляет данные из IndexedDB
   * @param {string} key - Ключ для удаления
   * @returns {Promise<boolean>} - Результат операции
   * @private
   */
  static async _removeFromIndexedDB(key) {
    if (!window.indexedDB) return false;
    
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        
        request.onerror = () => {
          console.warn('Ошибка при открытии IndexedDB');
          resolve(false);
        };
        
        request.onsuccess = (event) => {
          try {
            const db = event.target.result;
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const storeRequest = store.delete(key);
            
            storeRequest.onerror = () => {
              console.warn('Ошибка при удалении из IndexedDB');
              resolve(false);
            };
            
            storeRequest.onsuccess = () => {
              resolve(true);
            };
          } catch (error) {
            console.warn('Ошибка при работе с IndexedDB:', error);
            resolve(false);
          }
        };
      } catch (error) {
        console.warn('Ошибка при инициализации IndexedDB:', error);
        resolve(false);
      }
    });
  }
  
  /**
   * Очищает все данные из IndexedDB
   * @returns {Promise<boolean>} - Результат операции
   * @private
   */
  static async _clearIndexedDB() {
    if (!window.indexedDB) return false;
    
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        
        request.onerror = () => {
          console.warn('Ошибка при открытии IndexedDB');
          resolve(false);
        };
        
        request.onsuccess = (event) => {
          try {
            const db = event.target.result;
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const storeRequest = store.clear();
            
            storeRequest.onerror = () => {
              console.warn('Ошибка при очистке IndexedDB');
              resolve(false);
            };
            
            storeRequest.onsuccess = () => {
              resolve(true);
            };
          } catch (error) {
            console.warn('Ошибка при работе с IndexedDB:', error);
            resolve(false);
          }
        };
      } catch (error) {
        console.warn('Ошибка при инициализации IndexedDB:', error);
        resolve(false);
      }
    });
  }
  
  /**
   * Очищает данные с префиксом из хранилища
   * @param {Storage} storage - Хранилище (localStorage или sessionStorage)
   * @private
   */
  static _clearPrefixedStorage(storage) {
    try {
      const keysToRemove = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => storage.removeItem(key));
    } catch (error) {
      console.warn('Ошибка при очистке хранилища:', error);
    }
  }
  
  // Проверка авторизации
  static isAuthenticated() {
    try {
      // Проверяем наличие токена в localStorage
      if (typeof window === 'undefined') {
        return false; // На сервере считаем, что не авторизован
      }
      
      try {
        return !!localStorage.getItem('twitch_user') || !!Cookies.get('twitch_user');
      } catch (error) {
        console.warn('Ошибка при проверке localStorage:', error);
        // Проверяем только куки, если localStorage недоступен
        return !!Cookies.get('twitch_user');
      }
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
      return false;
    }
  }
  
  // Экспорт данных (для миграции)
  static async exportAllData() {
    try {
      // Проверяем, работаем ли в браузере
      if (typeof window === 'undefined') {
        console.warn('Cannot export data on server');
        return null;
      }
      
      try {
        const response = await fetch('/api/user-data/export', {
          credentials: 'include',
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (serverError) {
        console.warn('Ошибка при экспорте данных с сервера:', serverError);
      }
      
      // Если сервер недоступен, собираем данные из cookies
      try {
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
      } catch (cookieError) {
        console.warn('Ошибка при экспорте данных из cookies:', cookieError);
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при экспорте данных:', error);
      return null;
    }
  }
} 