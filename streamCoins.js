'use client';

// streamCoins.js - Virtual currency management system

// User's currency data structure
const userCurrencySchema = {
  userId: String,        // Linked to Twitch ID
  balance: Number,       // Current balance
  totalEarned: Number,   // Total earned over time
  totalSpent: Number,    // Total spent
  transactions: [        // Transaction history
    {
      id: String,
      type: String,      // 'earn' or 'spend'
      amount: Number,
      reason: String,    // 'ad_watch', 'referral', 'question', etc.
      timestamp: Date,
      metadata: Object   // Additional details based on transaction type
    }
  ],
  lastAdWatch: Date,     // For cooldown periods
  referralCode: String,  // User's unique referral code
  referredBy: String     // Who referred this user (if any)
};

// StreamCoins API Class
class StreamCoinsManager {
  constructor(userId, initialData = null) {
    this.userId = userId;
    this.data = initialData || this.getDefaultData();
    this.apiEndpoint = '/api/streamcoins';
  }
  
  getDefaultData() {
    return {
      userId: this.userId,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      transactions: [],
      lastAdWatch: new Date(0),
      referralCode: this.generateReferralCode(),
      referredBy: null
    };
  }
  
  generateReferralCode() {
    // Generate a unique referral code based on userId and timestamp
    const base = this.userId ? this.userId.substring(0, Math.min(5, this.userId.length)) : 'user';
    const randomPart = Math.random().toString(36).substring(2, 6);
    return `${base}-${randomPart}`.toUpperCase();
  }
  
  // Load user's currency data from server/localStorage
  async loadData() {
    try {
      // Проверяем, доступен ли window объект (клиентская сторона)
      if (typeof window === 'undefined') {
        return this.data; // Вернуть данные по умолчанию на сервере
      }
      
      // First try to get from localStorage for quick loading
      try {
        if (typeof localStorage !== 'undefined') {
          const cachedData = localStorage.getItem(`streamcoins_${this.userId}`);
          if (cachedData) {
            this.data = JSON.parse(cachedData);
          }
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
      }
      
      // Then fetch latest from server
      try {
        const response = await fetch(`${this.apiEndpoint}/${this.userId}`);
        if (response.ok) {
          const serverData = await response.json();
          this.data = serverData;
          // Update cache
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(`streamcoins_${this.userId}`, JSON.stringify(this.data));
            }
          } catch (cacheError) {
            console.warn('Failed to update cache:', cacheError);
          }
        }
      } catch (fetchError) {
        console.error('Failed to fetch from server:', fetchError);
      }
      
      return this.data;
    } catch (error) {
      console.error('Failed to load StreamCoins data:', error);
      // If we have cached data, use it despite the error
      return this.data;
    }
  }
  
  // Save updates to server
  async saveData() {
    try {
      // Проверяем, доступен ли window объект (клиентская сторона)
      if (typeof window === 'undefined') {
        return false; // Не выполняем сохранение на сервере
      }
      
      // Получаем CSRF-токен из куки
      let csrfToken = '';
      try {
        csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf_token='))
          ?.split('=')[1] || '';
      } catch (error) {
        console.warn('Could not get CSRF token:', error);
      }
      
      let token = '';
      try {
        if (typeof localStorage !== 'undefined') {
          token = localStorage.getItem('token') || '';
        }
      } catch (error) {
        console.warn('Could not get auth token:', error);
      }
        
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(this.data)
      });
      
      if (response.ok) {
        // Update cache with the latest data
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`streamcoins_${this.userId}`, JSON.stringify(this.data));
          }
        } catch (cacheError) {
          console.warn('Failed to update cache:', cacheError);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save StreamCoins data:', error);
      return false;
    }
  }
  
  // EARNING METHODS
  
  // Add coins for watching an ad
  async earnFromAd(adType = 'standard') {
    const now = new Date();
    const lastWatch = new Date(this.data.lastAdWatch);
    const timeDiff = now - lastWatch;
    
    // Prevent ad spam - 5 minute cooldown
    if (timeDiff < 5 * 60 * 1000) {
      const remainingSeconds = Math.ceil((5 * 60 * 1000 - timeDiff) / 1000);
      throw new Error(`Подождите ${remainingSeconds} секунд перед просмотром следующей рекламы`);
    }
    
    // Amount earned depends on ad type
    const adRewards = {
      'standard': 5,
      'premium': 15,
      'interactive': 10
    };
    
    const amount = adRewards[adType] || adRewards.standard;
    
    // Add transaction and update balance
    this.addTransaction('earn', amount, 'ad_watch', { adType });
    this.data.lastAdWatch = now;
    
    try {
      return await this.saveData();
    } catch (error) {
      console.error('Error saving after ad watch:', error);
      throw new Error('Не удалось сохранить начисление за просмотр рекламы');
    }
  }
  
  // Add coins for a successful referral
  async earnFromReferral(referredUserId) {
    // Award 50 coins for each new user referred
    const amount = 50;
    
    // Add transaction and update balance
    this.addTransaction('earn', amount, 'referral', { referredUserId });
    
    try {
      return await this.saveData();
    } catch (error) {
      console.error('Error saving referral reward:', error);
      throw new Error('Не удалось сохранить начисление за реферала');
    }
  }
  
  // Process a referral code used by a new user
  async useReferralCode(referralCode) {
    // This would check if the code is valid and assign it to the user
    // We also need to give coins to the referrer, which would be handled
    // by a server-side function that calls earnFromReferral
    
    this.data.referredBy = referralCode;
    try {
      return await this.saveData();
    } catch (error) {
      console.error('Error saving referral code usage:', error);
      throw new Error('Не удалось сохранить использование реферального кода');
    }
  }
  
  // Add coins from other activities (login streak, participation, etc.)
  async earnFromActivity(activity, amount) {
    this.addTransaction('earn', amount, activity);
    try {
      return await this.saveData();
    } catch (error) {
      console.error('Error saving activity reward:', error);
      throw new Error('Не удалось сохранить начисление за активность');
    }
  }
  
  // SPENDING METHODS
  
  // Spend coins to ask a streamer a question
  async spendOnQuestion(streamerId, questionText, amount) {
    if (this.data.balance < amount) {
      throw new Error(`Недостаточно средств. Нужно: ${amount}, Доступно: ${this.data.balance}`);
    }
    
    // Add transaction and update balance
    this.addTransaction('spend', amount, 'question', { 
      streamerId, 
      questionText: questionText.substring(0, 50) // Store preview only
    });
    
    try {
      return await this.saveData();
    } catch (error) {
      console.error('Error saving question spending:', error);
      throw new Error('Не удалось сохранить списание за вопрос');
    }
  }
  
  // Spend coins on special requests (like game suggestions, etc.)
  async spendOnRequest(streamerId, requestType, details, amount) {
    if (this.data.balance < amount) {
      throw new Error(`Недостаточно средств. Нужно: ${amount}, Доступно: ${this.data.balance}`);
    }
    
    // Add transaction and update balance
    this.addTransaction('spend', amount, 'request', { 
      streamerId, 
      requestType,
      details: details.substring(0, 100) // Store preview only
    });
    
    try {
      return await this.saveData();
    } catch (error) {
      console.error('Error saving request spending:', error);
      throw new Error('Не удалось сохранить списание за запрос');
    }
  }
  
  // HELPER METHODS
  
  // Add a transaction to the user's history
  addTransaction(type, amount, reason, metadata = {}) {
    const transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      amount,
      reason,
      timestamp: new Date(),
      metadata
    };
    
    this.data.transactions.unshift(transaction); // Add to beginning
    
    // Keep only last 100 transactions to manage storage size
    if (this.data.transactions.length > 100) {
      this.data.transactions = this.data.transactions.slice(0, 100);
    }
    
    // Update balances
    if (type === 'earn') {
      this.data.balance += amount;
      this.data.totalEarned += amount;
    } else if (type === 'spend') {
      this.data.balance -= amount;
      this.data.totalSpent += amount;
    }
    
    return transaction;
  }
  
  // Get current balance
  getBalance() {
    return this.data.balance;
  }
  
  // Get transaction history with optional filtering
  getTransactions(filter = {}) {
    let filtered = [...this.data.transactions];
    
    if (filter.type) {
      filtered = filtered.filter(t => t.type === filter.type);
    }
    
    if (filter.reason) {
      filtered = filtered.filter(t => t.reason === filter.reason);
    }
    
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      filtered = filtered.filter(t => new Date(t.timestamp) >= startDate);
    }
    
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      filtered = filtered.filter(t => new Date(t.timestamp) <= endDate);
    }
    
    return filtered;
  }
}

// Экспортируем класс, если мы находимся в среде, поддерживающей модули
if (typeof module !== 'undefined') {
  module.exports = StreamCoinsManager;
} else if (typeof window !== 'undefined') {
  // Для использования в браузере без поддержки модулей
  window.StreamCoinsManager = StreamCoinsManager;
}

// Для ES модулей
export default StreamCoinsManager;
