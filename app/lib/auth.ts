/**
 * Базовые функции аутентификации для работы с Twitch API
 */

import { cookies } from 'next/headers';
// import { redirect } from 'next/navigation'; // Не используется
import * as jwt from 'jsonwebtoken';
import supabase from '../../lib/supabaseClient';
import { SignJWT, jwtVerify } from 'jose';
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

export async function encrypt(payload: any): Promise<string> {
  // ... код ...
}

export async function decrypt(input: string): Promise<any> {
  // ... код ...
}

// Функция для сохранения сессии в куки
export async function saveSession(user: { id: string; [key: string]: any }) {
  const expires = new Date(Date.now() + SESSION_DURATION);
  const session = await encrypt({ user, expires });
  cookies().set(COOKIE_NAME, session, { expires, httpOnly: true, secure: true, path: '/', sameSite: 'lax' });
}

// Функция для получения сессии из куки
export async function getSession(): Promise<{ user: { id: string; [key: string]: any } | null }> {
  const session = cookies().get(COOKIE_NAME)?.value;
  if (!session) return { user: null };
  try {
    const decrypted = await decrypt(session);
    // Проверяем, что сессия не истекла
    if (new Date(decrypted.expires) < new Date()) {
      return { user: null };
    }
    return { user: decrypted.user };
  } catch /* (error) */ { // Заменяем error на _
    console.error('Error decrypting session:', /* error */); // Можно убрать логирование ошибки, если не нужно
    return { user: null };
  }
}

// Функция для обновления сессии (если нужно продлевать время жизни)
export async function updateSession(request: NextRequest) {
  const session = request.cookies.get(COOKIE_NAME)?.value;
  if (!session) return;

  try {
    const decrypted = await decrypt(session);
    if (!decrypted || new Date(decrypted.expires) < new Date()) {
      return; // Сессия невалидна или истекла
    }

    // Продлеваем сессию
    decrypted.expires = new Date(Date.now() + SESSION_DURATION);
    const res = NextResponse.next();
    res.cookies.set({
      name: COOKIE_NAME,
      value: await encrypt(decrypted),
      httpOnly: true,
      expires: decrypted.expires,
      secure: true,
      path: '/',
      sameSite: 'lax'
    });
    return res;
  } catch /* (error) */ { // Заменяем error на _
    console.error('Error updating session:', /* error */);
  }
}

// Функция для выхода из системы (удаления куки)
export async function logout() {
  cookies().set(COOKIE_NAME, '', { expires: new Date(0), path: '/' });
  // redirect('/login'); // Не нужно, если обработка редиректа на клиенте
}

// Функция для верификации токена доступа Twitch
async function verifyTwitchToken(token: string): Promise<{ valid: boolean; user?: any }> {
  if (!token) {
    return { valid: false };
  }
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      // Можно добавить проверку client_id и scopes, если нужно
      // Получаем данные пользователя после валидации
      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-ID': process.env.TWITCH_CLIENT_ID!
        }
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.data && userData.data.length > 0) {
          // Добавляем токен к данным пользователя для дальнейшего использования
          const user = { ...userData.data[0], accessToken: token }; 
          return { valid: true, user };
        }
      }
    }
    return { valid: false };
  } catch /* (error) */ { // Заменяем error на _
    console.error('Error verifying Twitch token:', /* error */);
    return { valid: false };
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