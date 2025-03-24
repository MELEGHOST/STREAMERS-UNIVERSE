import { DataStorage } from './dataStorage';

export class StreamCoinsManager {
  constructor(userId) {
    this.userId = userId;
    this.coinsDataKey = `data_streamcoins_${userId}`;
    this.legacyCoinsKey = `streamcoins_${userId}`;
  }

  async loadData() {
    try {
      // Пытаемся загрузить в новом формате
      let coinsData = await DataStorage.getData(this.coinsDataKey);
      
      // Если нет в новом формате, ищем в старом формате
      if (!coinsData) {
        const legacyCoins = await DataStorage.getData(this.legacyCoinsKey);
        if (legacyCoins) {
          // Если данные в старом формате - строка с балансом
          if (typeof legacyCoins === 'string') {
            const balance = parseInt(legacyCoins, 10) || 0;
            coinsData = {
              userId: this.userId,
              balance: balance,
              totalEarned: balance,
              totalSpent: 0,
              transactions: [],
              lastDailyBonus: null,
              lastAdWatch: new Date(0).toISOString(),
              referralCode: this.generateReferralCode(),
              referredBy: null
            };
          } else {
            // Это может быть объект старого формата
            coinsData = legacyCoins;
          }
          
          // Сохраняем в новом формате
          await this.saveData(coinsData);
        }
      }
      
      // Если все равно нет данных, создаем новые
      if (!coinsData) {
        coinsData = {
          userId: this.userId,
          balance: 100, // Даем 100 монет новичкам
          totalEarned: 100,
          totalSpent: 0,
          transactions: [{
            id: this.generateUUID(),
            amount: 100,
            type: 'earn',
            description: 'Начальные монеты',
            timestamp: new Date().toISOString()
          }],
          lastDailyBonus: null,
          lastAdWatch: new Date(0).toISOString(),
          referralCode: this.generateReferralCode(),
          referredBy: null
        };
        
        // Сохраняем новые данные
        await this.saveData(coinsData);
      }
      
      return coinsData;
    } catch (error) {
      console.error('Ошибка при загрузке данных о монетах:', error);
      throw error;
    }
  }

  async saveData(coinsData) {
    try {
      // Сохраняем в новом формате
      await DataStorage.saveData(this.coinsDataKey, coinsData);
      
      // Также сохраняем только баланс в старом формате для обратной совместимости
      await DataStorage.saveData(this.legacyCoinsKey, coinsData.balance.toString());
      
      return true;
    } catch (error) {
      console.error('Ошибка при сохранении данных о монетах:', error);
      throw error;
    }
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generateReferralCode() {
    // Генерируем 8-символьный код на основе ID пользователя и случайных чисел
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    // Берем первые 4 символа из хэша ID пользователя
    const userPart = this.userId.substring(0, 4).toUpperCase();
    return `${userPart}${randomPart}`;
  }
} 