/**
 * Базовые функции аутентификации для работы с Twitch API
 */

import { cookies } from 'next/headers';
// import { redirect } from 'next/navigation'; // Не используется
import * as jwt from 'jsonwebtoken';
import supabase from '../../lib/supabaseClient';
import { SignJWT, jwtVerify } from 'jose';
// import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Проверка доступности Supabase
const isSupabaseAvailable = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(supabaseUrl && supabaseAnonKey);
};

/**
 * Проверяет, авторизован ли пользователь
 * @returns {boolean} Статус авторизации
 */
export async function isAuthenticated() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('jwt_token')?.value;
    
    if (!token) {
      return false;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    return !!decoded;
  } catch /* (error) */ { // Заменяем error на _
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
  } catch /* (error) */ { // Заменяем error на _
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
export const createToken = async (userData: Record<string, unknown>) => {
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
export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch /* (error) */ { // Заменяем error на _
    return null;
  }
}

/**
 * Получает или создает пользователя на основе данных Twitch
 * @param {Object} twitchData - Данные пользователя из Twitch API
 * @returns {Promise<Object>} Данные пользователя
 */
export const getOrCreateUser = async (twitchData: {
  id: string;
  login: string;
  display_name: string;
  email: string;
  profile_image_url: string;
}) => {
  try {
    // Проверяем, доступен ли Supabase
    if (!isSupabaseAvailable()) {
      console.error('Supabase не настроен, невозможно работать с пользователями');
      // Возвращаем базовые данные о пользователе без сохранения в базу
      return {
        twitchId: twitchData.id,
        username: twitchData.login,
        displayName: twitchData.display_name,
        email: twitchData.email,
        avatar: twitchData.profile_image_url
      };
    }
    
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
    // В случае ошибки возвращаем базовые данные пользователя
    return {
      twitchId: twitchData.id,
      username: twitchData.login,
      displayName: twitchData.display_name,
      email: twitchData.email,
      avatar: twitchData.profile_image_url
    };
  }
};

// Код, относящийся к jose (возможно, для другого механизма сессий)
const secretKey = process.env.AUTH_SECRET;
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: unknown) {
  return await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function decrypt(_: string | Uint8Array): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(_, key, {
      algorithms: ['HS256'],
    });
    return payload as Record<string, unknown>;
  } catch (error) {
    console.error('Failed to verify session:', error);
    return null;
  }
}

export async function saveSession(_: unknown) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ user: _ });

  const cookieStore = await cookies();
  cookieStore.set('session', session, { expires, httpOnly: true });
}

export async function getSession(): Promise<Record<string, unknown> | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;

  const parsed = await decrypt(session);
  if (parsed) {
    parsed.expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const res = NextResponse.next();
    res.cookies.set({
      name: 'session',
      value: await encrypt(parsed),
      httpOnly: true,
      expires: parsed.expires as Date,
    });
    return res;
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set('session', '', { expires: new Date(0) });
}

/**
 * Проверяет Twitch токен на сервере
 * @param {string} token - Access token от Twitch
 * @returns {Promise<object | null>} - Данные пользователя или null
 */
export async function verifyTwitchToken(token: string): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `OAuth ${token}`,
      },
    });
    if (!response.ok) {
      console.error('Twitch token validation failed:', response.status);
      return null;
    }
    const _ = await response.json();
    return _ as Record<string, unknown>;
  } catch (error) {
    console.error('Error verifying Twitch token:', error);
    return null;
  }
}

// Именованный экспорт объекта с функциями
const authFunctions = {
  isAuthenticated,
  getCurrentUser,
  requireAuth,
  getAccessToken,
  verifyToken,
  createToken,
  getOrCreateUser,
  encrypt,
  decrypt,
  saveSession,
  getSession,
  updateSession,
  logout,
  verifyTwitchToken
};

export default authFunctions; 