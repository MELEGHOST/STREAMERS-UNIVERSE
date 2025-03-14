/**
 * Базовые функции аутентификации для работы с Twitch API
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Проверяет, авторизован ли пользователь
 * @returns {boolean} Статус авторизации
 */
export async function isAuthenticated() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('jwt_token')?.value;
    
    if (!token) {
      return false;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    return !!decoded;
  } catch (error) {
    return false;
  }
}

/**
 * Получает данные текущего пользователя
 * @returns {Object|null} Данные пользователя или null, если не авторизован
 */
export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('jwt_token')?.value;
    
    if (!token) {
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Проверяет авторизацию и перенаправляет на страницу авторизации, если пользователь не авторизован
 */
export async function requireAuth() {
  const isAuth = await isAuthenticated();
  if (!isAuth) {
    throw new Error('Unauthorized');
  }
}

/**
 * Получает токен доступа
 * @returns {string|null} Токен доступа или null, если не авторизован
 */
export async function getAccessToken() {
  const cookieStore = cookies();
  return cookieStore.get('twitch_access_token')?.value;
}

/**
 * Создает JWT токен для пользователя
 * @param {Object} userData - Данные пользователя
 * @returns {Promise<string>} JWT токен
 */
export const createToken = async (userData) => {
  const token = jwt.sign(userData, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
  
  return token;
};

/**
 * Проверяет JWT токен
 * @param {string} token - JWT токен
 * @returns {Promise<Object|null>} Данные пользователя или null, если токен недействителен
 */
export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

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