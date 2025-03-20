import supabase from './supabase';

/**
 * Получает данные пользователя по Twitch ID
 * @param {string} twitchId - Twitch ID пользователя
 * @returns {Promise<Object|null>} - Данные пользователя или null
 */
export async function getUserByTwitchId(twitchId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('twitchId', twitchId)
      .single();
    
    if (error) {
      console.error('Ошибка при получении пользователя:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    return null;
  }
}

/**
 * Создает нового пользователя
 * @param {Object} userData - Данные пользователя
 * @returns {Promise<Object|null>} - Созданный пользователь или null
 */
export async function createUser(userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при создании пользователя:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    return null;
  }
}

/**
 * Обновляет данные пользователя
 * @param {string} userId - ID пользователя
 * @param {Object} userData - Данные для обновления
 * @returns {Promise<Object|null>} - Обновленный пользователь или null
 */
export async function updateUser(userId, userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    return null;
  }
}

/**
 * Получает подписчиков пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<Array|null>} - Список подписчиков или null
 */
export async function getFollowers(userId) {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        *,
        follower:users!follower_id(*)
      `)
      .eq('followed_id', userId);
    
    if (error) {
      console.error('Ошибка при получении подписчиков:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении подписчиков:', error);
    return null;
  }
}

/**
 * Добавляет подписку
 * @param {Object} followData - Данные подписки
 * @returns {Promise<Object|null>} - Созданная подписка или null
 */
export async function addFollow(followData) {
  try {
    const { data, error } = await supabase
      .from('follows')
      .insert([followData])
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при добавлении подписки:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при добавлении подписки:', error);
    return null;
  }
}

export default {
  getUserByTwitchId,
  createUser,
  updateUser,
  getFollowers,
  addFollow
}; 