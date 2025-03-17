'use client';

import { SignJWT, jwtVerify } from 'jose';
import Cookies from 'js-cookie';

// Функция для получения секретного ключа
// В режиме разработки используем временный ключ, в продакшне - переменную окружения
const getSecretKey = () => {
  // Проверяем, работаем ли мы на клиенте
  if (typeof window !== 'undefined') {
    // На клиенте нет доступа к секретному ключу
    console.log('Попытка получить секретный ключ на клиенте - это невозможно');
    return null;
  }
  
  // Это выполняется только на сервере
  if (typeof process !== 'undefined') {
    return new TextEncoder().encode(
      process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' 
        ? undefined // В продакшне должен быть установлен секрет
        : 'temporary_dev_key_not_for_production')
    );
  }
  
  // Если мы здесь, значит что-то пошло не так
  return null;
};

// Создание JWT токена (только на сервере)
export async function createJwtToken(payload) {
  try {
    // Проверяем, работаем ли мы на клиенте
    if (typeof window !== 'undefined') {
      console.log('Создание JWT токена не поддерживается на клиенте');
      return null;
    }
    
    const secretKey = getSecretKey();
    
    if (!secretKey) {
      console.error('JWT_SECRET не установлен на сервере или попытка создать токен на клиенте');
      return null;
    }
    
    // Создаем новый JWT токен
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Срок действия 7 дней
      .sign(secretKey);
    
    return token;
  } catch (error) {
    console.error('Ошибка при создании JWT токена:', error);
    return null;
  }
}

// Верификация JWT токена (только на сервере)
export async function verifyJwtToken(token) {
  try {
    const secretKey = getSecretKey();
    
    if (!secretKey) {
      console.error('JWT_SECRET не установлен на сервере');
      return null;
    }
    
    // Проверяем JWT токен
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    console.error('Ошибка при верификации JWT токена:', error);
    return null;
  }
}

// Получение токена из cookies или localStorage (клиентская часть)
export function getAuthToken() {
  // Проверяем наличие JWT токена
  const jwtToken = Cookies.get('auth_token');
  
  if (jwtToken) {
    return jwtToken;
  }
  
  // Проверяем наличие Twitch токена (для обратной совместимости)
  const twitchToken = Cookies.get('twitch_token') || 
                     Cookies.get('twitch_access_token') ||
                     localStorage.getItem('cookie_twitch_access_token');
                     
  return twitchToken;
}

// Получение данных пользователя из cookies или localStorage (клиентская часть)
export function getUserData() {
  try {
    // Проверяем наличие данных пользователя
    const userData = Cookies.get('twitch_user') || 
                    localStorage.getItem('cookie_twitch_user') || 
                    localStorage.getItem('twitch_user');
    
    if (userData) {
      return typeof userData === 'string' ? JSON.parse(userData) : userData;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return null;
  }
}

// Интеграция с существующим AuthContext (серверная часть)
export async function authenticateUser(req) {
  try {
    // Получаем JWT токен из cookies запроса
    const cookieStore = req.cookies;
    
    // Проверяем различные возможные токены
    const token = cookieStore.get('auth_token')?.value || 
                 cookieStore.get('twitch_token')?.value || 
                 cookieStore.get('twitch_access_token')?.value;
    
    if (token) {
      // Проверяем JWT токен
      const payload = await verifyJwtToken(token);
      
      if (payload) {
        return payload;
      }
    }
    
    // Если JWT токен не найден или недействителен, пытаемся получить данные пользователя из cookies
    const userDataCookie = cookieStore.get('twitch_user')?.value;
    
    if (userDataCookie) {
      try {
        const userData = JSON.parse(userDataCookie);
        
        if (userData && userData.id) {
          // Создаем минимальный объект пользователя
          return {
            userId: userData.id,
            userLogin: userData.login || userData.display_name,
            userAvatar: userData.profile_image_url
          };
        }
      } catch (e) {
        console.error('Ошибка при парсинге данных пользователя из cookies:', e);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при аутентификации пользователя:', error);
    return null;
  }
} 