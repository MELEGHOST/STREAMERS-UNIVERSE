/**
 * Базовые функции аутентификации для работы с Twitch API
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify, SignJWT } from 'jose';
import prisma from './prisma';

// Секретный ключ для JWT
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_jwt_secret_key_min_32_chars_long'
);

/**
 * Проверяет, авторизован ли пользователь
 * @returns {boolean} Статус авторизации
 */
export const isAuthenticated = () => {
  const cookieStore = cookies();
  const token = cookieStore.get('twitch_access_token');
  return !!token;
};

/**
 * Получает данные текущего пользователя
 * @returns {Object|null} Данные пользователя или null, если не авторизован
 */
export const getCurrentUser = () => {
  try {
    const cookieStore = cookies();
    const userDataCookie = cookieStore.get('twitch_user');
    
    if (!userDataCookie) {
      return null;
    }
    
    return JSON.parse(userDataCookie.value);
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return null;
  }
};

/**
 * Проверяет авторизацию и перенаправляет на страницу авторизации, если пользователь не авторизован
 */
export const requireAuth = () => {
  if (!isAuthenticated()) {
    redirect('/auth');
  }
};

/**
 * Получает токен доступа
 * @returns {string|null} Токен доступа или null, если не авторизован
 */
export const getAccessToken = () => {
  const cookieStore = cookies();
  const token = cookieStore.get('twitch_access_token');
  return token ? token.value : null;
};

/**
 * Создает JWT токен для пользователя
 * @param {Object} userData - Данные пользователя
 * @returns {Promise<string>} JWT токен
 */
export const createToken = async (userData) => {
  const token = await new SignJWT({ 
    id: userData.id,
    twitchId: userData.twitchId,
    username: userData.username
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '7d')
    .sign(JWT_SECRET);
  
  return token;
};

/**
 * Проверяет JWT токен
 * @param {string} token - JWT токен
 * @returns {Promise<Object|null>} Данные пользователя или null, если токен недействителен
 */
export const verifyToken = async (token) => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: { id: payload.id }
    });
    
    return user;
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return null;
  }
};

/**
 * Получает или создает пользователя на основе данных Twitch
 * @param {Object} twitchData - Данные пользователя из Twitch API
 * @returns {Promise<Object>} Данные пользователя
 */
export const getOrCreateUser = async (twitchData) => {
  try {
    // Ищем пользователя по Twitch ID
    let user = await prisma.user.findUnique({
      where: { twitchId: twitchData.id }
    });
    
    // Если пользователь не найден, создаем нового
    if (!user) {
      user = await prisma.user.create({
        data: {
          twitchId: twitchData.id,
          username: twitchData.login,
          displayName: twitchData.display_name,
          email: twitchData.email,
          avatar: twitchData.profile_image_url
        }
      });
    } else {
      // Обновляем данные пользователя
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: twitchData.login,
          displayName: twitchData.display_name,
          email: twitchData.email,
          avatar: twitchData.profile_image_url
        }
      });
    }
    
    return user;
  } catch (error) {
    console.error('Ошибка при получении/создании пользователя:', error);
    throw error;
  }
};

export default {
  isAuthenticated,
  getCurrentUser,
  requireAuth,
  getAccessToken,
  verifyToken,
  createToken,
  getOrCreateUser
}; 