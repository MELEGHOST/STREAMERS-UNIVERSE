// streamCoinsController.js (переименован в .js для ES-модулей)
import { getSession } from 'next-auth/next'; // Для проверки авторизации через next-auth

// Вспомогательные функции для работы с данными
const storage = {
  // Функция для загрузки данных (с проверкой окружения)
  loadStreamCoins: (userId) => {
    // Проверяем, работаем ли мы на клиенте или на сервере
    if (typeof window === 'undefined') {
      // На сервере возвращаем пустой объект
      return {
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        transactions: [],
        lastAdWatch: new Date(0),
        referralCode: '',
        referredBy: null
      };
    }
    
    try {
      const data = localStorage.getItem(`streamCoins_${userId}`);
      return data ? JSON.parse(data) : {
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        transactions: [],
        lastAdWatch: new Date(0),
        referralCode: '',
        referredBy: null
      };
    } catch (error) {
      console.error('Error loading StreamCoins data:', error);
      return {
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        transactions: [],
        lastAdWatch: new Date(0),
        referralCode: '',
        referredBy: null
      };
    }
  },
  
  // Функция для сохранения данных (с проверкой окружения)
  saveStreamCoins: (userId, data) => {
    // Проверяем, работаем ли мы на клиенте или на сервере
    if (typeof window === 'undefined') {
      return false; // На сервере не сохраняем
    }
    
    try {
      localStorage.setItem(`streamCoins_${userId}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving StreamCoins data:', error);
      return false;
    }
  }
};

export async function getUserData(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.params.userId;
    const session = await getSession({ req });
    
    // Проверяем, авторизован ли пользователь через next-auth
    if (!session || session.user.id !== userId) {
      return res.status(403).json({ error: 'Нет доступа к этим данным' });
    }

    // Загружаем данные
    const userData = storage.loadStreamCoins(userId);
    
    // Проверяем наличие данных
    if (!userData) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user StreamCoins data:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

export async function updateUserData(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userData = req.body;
    const session = await getSession({ req });

    // Проверяем, авторизован ли пользователь
    if (!session || session.user.id !== userData.userId) {
      return res.status(403).json({ error: 'Нет прав для обновления этих данных' });
    }

    // Загружаем текущие данные
    const currentData = storage.loadStreamCoins(userData.userId);
    if (!currentData) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Обновляем данные
    const updatedData = {
      balance: userData.balance || currentData.balance,
      totalEarned: userData.totalEarned || currentData.totalEarned,
      totalSpent: userData.totalSpent || currentData.totalSpent,
      lastAdWatch: userData.lastAdWatch || currentData.lastAdWatch,
      referralCode: userData.referralCode || currentData.referralCode,
      referredBy: userData.referredBy || currentData.referredBy,
      transactions: [...currentData.transactions, ...(userData.transactions || [])]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 100) // Ограничиваем до 100 транзакций
    };

    // Сохраняем данные
    const saveResult = storage.saveStreamCoins(userData.userId, updatedData);
    
    if (saveResult) {
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ error: 'Не удалось сохранить данные' });
    }
  } catch (error) {
    console.error('Error updating StreamCoins data:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

export async function processReferral(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referralCode, newUserId } = req.body;
    const session = await getSession({ req });

    // Проверяем, авторизован ли новый пользователь
    if (!session || session.user.id !== newUserId) {
      return res.status(403).json({ error: 'Нет прав для обработки реферала' });
    }

    // Загружаем данные реферера и нового пользователя
    const referrerData = storage.loadStreamCoins(referralCode);
    const newUserData = storage.loadStreamCoins(newUserId);

    if (!referrerData) {
      return res.status(404).json({ error: 'Неверный реферальный код' });
    }

    if (!newUserData) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем, есть ли у нового пользователя реферер
    if (newUserData.referredBy) {
      return res.status(400).json({ error: 'У пользователя уже есть реферер' });
    }

    // Награждаем реферера 50 монетами
    referrerData.balance += 50;
    referrerData.totalEarned += 50;

    // Создаём транзакцию для реферера
    const transaction = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: referralCode,
      type: 'earn',
      amount: 50,
      reason: 'referral',
      timestamp: new Date().toISOString(),
      metadata: { referredUserId: newUserId }
    };

    // Устанавливаем реферера для нового пользователя
    newUserData.referredBy = referralCode;

    // Обновляем транзакции реферера
    referrerData.transactions = [transaction, ...referrerData.transactions]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100);

    // Сохраняем обновлённые данные
    const saveReferrerResult = storage.saveStreamCoins(referralCode, referrerData);
    const saveNewUserResult = storage.saveStreamCoins(newUserId, newUserData);
    
    if (saveReferrerResult && saveNewUserResult) {
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ error: 'Не удалось сохранить данные' });
    }
  } catch (error) {
    console.error('Error processing referral:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

export default { getUserData, updateUserData, processReferral };
