/**
 * Утилита для безопасной работы с localStorage
 * Предотвращает ошибки при серверном рендеринге
 */

// Проверка доступности локального хранилища
const isLocalStorageAvailable = () => {
  if (typeof window === 'undefined') return false;
  if (!window.localStorage) return false;
  
  try {
    // Проверяем работоспособность localStorage
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Безопасно получает значение из localStorage
 * @param {string} key - ключ
 * @param {*} defaultValue - значение по умолчанию
 * @returns {*} - значение из хранилища или defaultValue
 */
export const getItem = (key, defaultValue = null) => {
  if (!isLocalStorageAvailable()) return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return defaultValue;
    
    // Пытаемся распарсить JSON, если это не удается, возвращаем исходную строку
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  } catch (e) {
    console.warn(`Ошибка при получении "${key}" из localStorage:`, e);
    return defaultValue;
  }
};

/**
 * Безопасно сохраняет значение в localStorage
 * @param {string} key - ключ
 * @param {*} value - значение (будет преобразовано в JSON, если не строка)
 * @returns {boolean} - успешно ли сохранено значение
 */
export const setItem = (key, value) => {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, valueToStore);
    return true;
  } catch (e) {
    console.warn(`Ошибка при сохранении "${key}" в localStorage:`, e);
    return false;
  }
};

/**
 * Безопасно удаляет значение из localStorage
 * @param {string} key - ключ
 * @returns {boolean} - успешно ли удалено значение
 */
export const removeItem = (key) => {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`Ошибка при удалении "${key}" из localStorage:`, e);
    return false;
  }
};

/**
 * Безопасно очищает все значения в localStorage
 * @returns {boolean} - успешно ли очищено хранилище
 */
export const clear = () => {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    window.localStorage.clear();
    return true;
  } catch (e) {
    console.warn('Ошибка при очистке localStorage:', e);
    return false;
  }
};

/**
 * Безопасно получает массив ключей localStorage
 * @returns {string[]} - массив ключей
 */
export const getKeys = () => {
  if (!isLocalStorageAvailable()) return [];
  
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  } catch (e) {
    console.warn('Ошибка при получении ключей localStorage:', e);
    return [];
  }
};

/**
 * Безопасно получает все пары ключ-значение из localStorage
 * @returns {Object} - объект с парами ключ-значение
 */
export const getAll = () => {
  if (!isLocalStorageAvailable()) return {};
  
  try {
    const result = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        result[key] = getItem(key);
      }
    }
    return result;
  } catch (e) {
    console.warn('Ошибка при получении всех данных из localStorage:', e);
    return {};
  }
};

// Экспортируем все функции в объекте для удобства
const clientStorage = {
  getItem,
  setItem,
  removeItem,
  clear,
  getKeys,
  getAll,
  isAvailable: isLocalStorageAvailable
};

export default clientStorage; 