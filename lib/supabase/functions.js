import supabase from '../supabaseClient';

/**
 * Уменьшает количество монет у пользователя
 * @param {string} userId - ID пользователя
 * @param {number} amount - Количество монет для списания
 * @returns {Promise<Object>} - Результат операции
 */
export async function decrementCoins(userId, amount) {
  try {
    // Получаем текущее количество монет
    const { data: user, error } = await supabase
      .from('users')
      .select('streamCoins')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Ошибка при получении данных пользователя:', error);
      throw error;
    }

    // Вычисляем новое значение (не меньше 0)
    const currentCoins = user.streamCoins || 0;
    const newCoins = Math.max(0, currentCoins - amount);

    // Обновляем значение
    const { data, error: updateError } = await supabase
      .from('users')
      .update({ streamCoins: newCoins })
      .eq('id', userId);

    if (updateError) {
      console.error('Ошибка при обновлении монет:', updateError);
      throw updateError;
    }

    return { success: true, newBalance: newCoins };
  } catch (error) {
    console.error('Ошибка при уменьшении монет:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Увеличивает количество монет у пользователя
 * @param {string} userId - ID пользователя
 * @param {number} amount - Количество монет для начисления
 * @returns {Promise<Object>} - Результат операции
 */
export async function incrementCoins(userId, amount) {
  try {
    // Получаем текущее количество монет
    const { data: user, error } = await supabase
      .from('users')
      .select('streamCoins')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Ошибка при получении данных пользователя:', error);
      throw error;
    }

    // Вычисляем новое значение
    const currentCoins = user.streamCoins || 0;
    const newCoins = currentCoins + amount;

    // Обновляем значение
    const { data, error: updateError } = await supabase
      .from('users')
      .update({ streamCoins: newCoins })
      .eq('id', userId);

    if (updateError) {
      console.error('Ошибка при обновлении монет:', updateError);
      throw updateError;
    }

    return { success: true, newBalance: newCoins };
  } catch (error) {
    console.error('Ошибка при увеличении монет:', error);
    return { success: false, error: error.message };
  }
}

export default {
  decrementCoins,
  incrementCoins
}; 