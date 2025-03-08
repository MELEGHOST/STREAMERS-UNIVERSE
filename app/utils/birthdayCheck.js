/**
 * Проверяет, является ли сегодня днем рождения пользователя
 * и начисляет бонусные коины, если это так
 * @param {string} userId - ID пользователя
 * @returns {boolean} - true, если сегодня день рождения пользователя
 */
export const checkBirthday = (userId) => {
  if (!userId) return false;
  
  try {
    // Получаем день рождения пользователя из localStorage
    const birthdayString = localStorage.getItem(`birthday_${userId}`);
    if (!birthdayString) return false;
    
    // Получаем текущую дату
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // Месяцы в JS начинаются с 0
    const todayDay = today.getDate();
    
    // Получаем дату рождения
    const birthday = new Date(birthdayString);
    const birthMonth = birthday.getMonth() + 1;
    const birthDay = birthday.getDate();
    
    // Проверяем, совпадает ли день и месяц
    const isBirthday = (todayMonth === birthMonth && todayDay === birthDay);
    
    if (isBirthday) {
      // Проверяем, были ли уже начислены коины в этом году
      const currentYear = today.getFullYear();
      const lastBirthdayReward = localStorage.getItem(`birthday_reward_${userId}_${currentYear}`);
      
      if (!lastBirthdayReward) {
        // Начисляем 100 коинов
        const currentCoins = parseInt(localStorage.getItem(`streamcoins_${userId}`) || '0', 10);
        localStorage.setItem(`streamcoins_${userId}`, (currentCoins + 100).toString());
        
        // Записываем, что награда за день рождения в этом году уже выдана
        localStorage.setItem(`birthday_reward_${userId}_${currentYear}`, 'true');
        
        // Добавляем запись в историю транзакций
        const transactions = JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]');
        transactions.push({
          id: Date.now(),
          type: 'birthday_reward',
          amount: 100,
          date: new Date().toISOString(),
          description: 'Бонус в честь дня рождения'
        });
        localStorage.setItem(`transactions_${userId}`, JSON.stringify(transactions));
        
        // Показываем уведомление
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка при проверке дня рождения:', error);
    return false;
  }
};

/**
 * Получает количество дней до дня рождения пользователя
 * @param {string} userId - ID пользователя
 * @returns {number|null} - количество дней до дня рождения или null, если день рождения не указан
 */
export const getDaysToBirthday = (userId) => {
  if (!userId) return null;
  
  try {
    // Получаем день рождения пользователя из localStorage
    const birthdayString = localStorage.getItem(`birthday_${userId}`);
    if (!birthdayString) return null;
    
    // Получаем текущую дату
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Получаем дату рождения
    const birthday = new Date(birthdayString);
    const birthMonth = birthday.getMonth();
    const birthDay = birthday.getDate();
    
    // Создаем дату дня рождения в текущем году
    const birthdayThisYear = new Date(currentYear, birthMonth, birthDay);
    
    // Если день рождения в этом году уже прошел, берем дату на следующий год
    if (birthdayThisYear < today) {
      birthdayThisYear.setFullYear(currentYear + 1);
    }
    
    // Вычисляем разницу в днях
    const diffTime = birthdayThisYear - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Ошибка при расчете дней до дня рождения:', error);
    return null;
  }
}; 