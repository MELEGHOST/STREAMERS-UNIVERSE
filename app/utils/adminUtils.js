'use client';

import supabase from '../../lib/supabase';
import { DataStorage } from './dataStorage';

/**
 * Проверяет, имеет ли текущий пользователь права администратора
 * @returns {Promise<object>} Объект с информацией о правах администратора
 */
export const checkAdminAccess = async () => {
  try {
    // Получаем данные пользователя
    const userData = await DataStorage.getData('user');
    
    if (!userData || !userData.id) {
      return { isAdmin: false, role: null, error: 'Не авторизован' };
    }
    
    // Проверяем наличие прав администратора в Supabase
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', userData.id)
      .single();
    
    if (adminError) {
      console.error('Ошибка при проверке прав администратора:', adminError);
      return { isAdmin: false, role: null, error: 'Ошибка при проверке прав' };
    }
    
    if (!adminData) {
      return { isAdmin: false, role: null, error: 'Нет прав администратора' };
    }
    
    return { isAdmin: true, role: adminData.role, error: null };
  } catch (error) {
    console.error('Ошибка при проверке прав администратора:', error);
    return { isAdmin: false, role: null, error: 'Произошла ошибка при проверке прав' };
  }
};

/**
 * Проверяет, имеет ли пользователь роль модератора или выше
 * @param {string} role - Роль пользователя
 * @returns {boolean} Результат проверки
 */
export const isModeratorOrHigher = (role) => {
  return ['moderator', 'admin', 'superadmin'].includes(role);
};

/**
 * Проверяет, имеет ли пользователь роль администратора или выше
 * @param {string} role - Роль пользователя
 * @returns {boolean} Результат проверки
 */
export const isAdminOrHigher = (role) => {
  return ['admin', 'superadmin'].includes(role);
};

/**
 * Проверяет, имеет ли пользователь роль суперадмина
 * @param {string} role - Роль пользователя
 * @returns {boolean} Результат проверки
 */
export const isSuperAdmin = (role) => {
  return role === 'superadmin';
};

/**
 * Назначает пользователю роль администратора
 * @param {string} userId - ID пользователя, которому назначается роль
 * @param {string} role - Роль администратора (moderator, admin, superadmin)
 * @param {string} granterId - ID пользователя, который назначает роль
 * @returns {Promise<object>} Результат операции
 */
export const grantAdminRole = async (userId, role, granterId) => {
  try {
    // Проверяем входные данные
    if (!userId || !role || !granterId) {
      return { success: false, error: 'Недостаточно данных для назначения роли' };
    }
    
    // Проверяем права текущего пользователя
    const adminAccess = await checkAdminAccess();
    
    if (!adminAccess.isAdmin || !isAdminOrHigher(adminAccess.role)) {
      return { success: false, error: 'Недостаточно прав для назначения ролей администратора' };
    }
    
    // Проверяем, не пытается ли пользователь назначить роль выше своей
    if (role === 'superadmin' && adminAccess.role !== 'superadmin') {
      return { success: false, error: 'Только суперадмин может назначать роль суперадмина' };
    }
    
    // Вызываем хранимую процедуру для добавления администратора
    const { data, error } = await supabase.rpc('add_admin_user', {
      admin_id: userId,
      admin_role: role,
      granter_id: granterId
    });
    
    if (error) {
      console.error('Ошибка при назначении роли администратора:', error);
      return { success: false, error: 'Ошибка при назначении роли администратора' };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Ошибка при назначении роли администратора:', error);
    return { success: false, error: 'Произошла ошибка при назначении роли администратора' };
  }
}; 