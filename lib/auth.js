/**
 * Базовые функции аутентификации для работы с Twitch API
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createHash } from 'crypto';
import axios from 'axios';
import supabase from './supabaseClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const cookieName = 'twitch_access_token';
const refreshCookieName = 'twitch_refresh_token';

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
    const cookieStore = await cookies();
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
  const cookieStore = await cookies();
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
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('twitchId', twitchData.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Ошибка при поиске пользователя:', error);
      throw error;
    }
    
    // Если пользователь не найден, создаем нового
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          twitchId: twitchData.id,
          username: twitchData.login,
          displayName: twitchData.display_name,
          email: twitchData.email,
          avatar: twitchData.profile_image_url
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('Ошибка при создании пользователя:', createError);
        throw createError;
      }
      
      return newUser;
    } else {
      // Обновляем данные пользователя
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          username: twitchData.login,
          displayName: twitchData.display_name,
          email: twitchData.email,
          avatar: twitchData.profile_image_url,
          updatedAt: new Date()
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Ошибка при обновлении пользователя:', updateError);
        throw updateError;
      }
      
      return updatedUser;
    }
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