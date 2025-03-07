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
    const base = this.userId.substring(0, 5);
    const randomPart = Math.random().toString(36).substring(2, 6);
    return `${base}-${randomPart}`.toUpperCase();
  }
  
  // Load user's currency data from server/localStorage
  async loadData() {
    try {
      // First try to get from localStorage for quick loading
      const cachedData = localStorage.getItem(`streamcoins_${this.userId}`);
      if (cachedData) {
        this.data = JSON.parse(cachedData);
      }
      
      // Then fetch latest from server
      const response = await fetch(`${this.apiEndpoint}/${this.userId}`);
      if (response.ok) {
        const serverData = await response.json();
        this.data = serverData;
        // Update cache
        localStorage.setItem(`streamcoins_${this.userId}`, JSON.stringify(this.data));
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
      // Получаем CSRF-токен из куки
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];
        
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-CSRF-Token': csrfToken || '' // Добавляем CSRF-токен в заголовок
        },
        body: JSON.stringify(this.data)
      });
      
      if (response.ok) {
        // Update cache with the latest data
        localStorage.setItem(`streamcoins_${this.userId}`, JSON.stringify(this.data));
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
    
    return await this.saveData();
  }
  
  // Add coins for a successful referral
  async earnFromReferral(referredUserId) {
    // Award 50 coins for each new user referred
    const amount = 50;
    
    // Add transaction and update balance
    this.addTransaction('earn', amount, 'referral', { referredUserId });
    
    return await this.saveData();
  }
  
  // Process a referral code used by a new user
  async useReferralCode(referralCode) {
    // This would check if the code is valid and assign it to the user
    // We also need to give coins to the referrer, which would be handled
    // by a server-side function that calls earnFromReferral
    
    this.data.referredBy = referralCode;
    return await this.saveData();
  }
  
  // Add coins from other activities (login streak, participation, etc.)
  async earnFromActivity(activity, amount) {
    this.addTransaction('earn', amount, activity);
    return await this.saveData();
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
    
    return await this.saveData();
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
    
    return await this.saveData();
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

export default StreamCoinsManager;
