/**
 * Утилиты для работы с Twitch API
 */

/**
 * Получает фолловеров пользователя
 * @param {string} userId - ID пользователя в Twitch
 * @param {string} accessToken - Токен доступа к Twitch API
 * @returns {Promise<Object>} - Данные о фолловерах
 */
export async function getUserFollowers(userId, accessToken) {
  if (!userId || !accessToken) {
    throw new Error('Необходимы userId и accessToken');
  }

  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_TWITCH_CLIENT_ID не найден в переменных окружения');
  }

  try {
    // Используем наш собственный API-роут для избежания CORS проблем
    const response = await fetch(`/api/twitch/user-followers?userId=${userId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ошибка: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении фолловеров:', error);
    throw error;
  }
}

/**
 * Получает данные пользователя из localStorage
 * @returns {Object|null} - Данные пользователя или null, если данные отсутствуют
 */
export function getUserFromLocalStorage() {
  try {
    const userData = localStorage.getItem('twitch_user');
    if (!userData) return null;
    return JSON.parse(userData);
  } catch (error) {
    console.error('Ошибка при получении данных пользователя из localStorage:', error);
    return null;
  }
}

/**
 * Получает токен доступа из cookie
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
 * Сохраняет данные в localStorage с обработкой ошибок
 * @param {string} key - Ключ для сохранения
 * @param {any} value - Значение для сохранения
 * @returns {boolean} - true, если сохранение прошло успешно, иначе false
 */
export function safeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Ошибка при сохранении ${key} в localStorage:`, error);
    return false;
  }
} 