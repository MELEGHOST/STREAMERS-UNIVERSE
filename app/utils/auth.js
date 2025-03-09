import { SignJWT, jwtVerify } from 'jose';
import Cookies from 'js-cookie';

// Функция для получения секретного ключа
// В режиме разработки используем временный ключ, в продакшне - переменную окружения
const getSecretKey = () => {
  // Это выполняется только на сервере
  if (typeof process !== 'undefined') {
    return new TextEncoder().encode(
      process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' 
        ? undefined // В продакшне должен быть установлен секрет
        : 'temporary_dev_key_not_for_production')
    );
  }
  // Клиент не имеет доступа к секрету
  return null;
};

// Создание JWT токена (только на сервере)
export async function createJwtToken(payload) {
  try {
    const secretKey = getSecretKey();
    
    if (!secretKey) {
      console.error('JWT_SECRET не установлен на сервере');
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
    const token = req.cookies.auth_token || req.cookies.twitch_token || req.cookies.twitch_access_token;
    
    if (!token) {
      return null;
    }
    
    // Проверяем JWT токен
    const payload = await verifyJwtToken(token);
    
    if (!payload) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Ошибка при аутентификации пользователя:', error);
    return null;
  }
} 