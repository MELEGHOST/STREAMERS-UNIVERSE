const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Server-side controller for StreamCoins
const streamCoinsController = {
  // GET /api/streamcoins/:userId - Get user's StreamCoins data
  getUserData: async (req, res) => {
    try {
      const userId = req.params.userId;
      
      // Verify the requesting user has permission to access this data
      if (req.user.id !== userId && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Нет доступа к этим данным' });
      }
      
      // Get user data
      const user = await User.findById(userId).select('streamCoins');
      
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      // Get transactions
      const transactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(100);
      
      const userData = {
        userId,
        balance: user.streamCoins.balance || 0,
        totalEarned: user.streamCoins.totalEarned || 0,
        totalSpent: user.streamCoins.totalSpent || 0,
        transactions: transactions,
        lastAdWatch: user.streamCoins.lastAdWatch || new Date(0),
        referralCode: user.streamCoins.referralCode || '',
        referredBy: user.streamCoins.referredBy || null
      };
      
      res.status(200).json(userData);
    } catch (error) {
      console.error('Error fetching user StreamCoins data:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },
  
  // POST /api/streamcoins - Update user's StreamCoins data
  updateUserData: async (req, res) => {
    try {
      const userData = req.body;
      
      // Verify the requesting user has permission
      if (req.user.id !== userData.userId && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Нет прав для обновления этих данных' });
      }
      
      // Find the user
      const user = await User.findById(userData.userId);
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      // Update user's StreamCoins data
      user.streamCoins = {
        balance: userData.balance,
        totalEarned: userData.totalEarned,
        totalSpent: userData.totalSpent,
        lastAdWatch: userData.lastAdWatch,
        referralCode: userData.referralCode,
        referredBy: userData.referredBy
      };
      
      await user.save();
      
      // If there are new transactions, save them
      if (userData.transactions && userData.transactions.length > 0) {
        // Find the most recent transaction we already have
        const latestTransaction = await Transaction.findOne({ userId: userData.userId })
          .sort({ createdAt: -1 })
          .limit(1);
        
        const latestTimestamp = latestTransaction ? new Date(latestTransaction.timestamp) : new Date(0);
        
        // Filter to only new transactions
        const newTransactions = userData.transactions.filter(
          t => new Date(t.timestamp) > latestTimestamp
        );
        
        // Save new transactions
        if (newTransactions.length > 0) {
          const transactions = newTransactions.map(t => ({
            transactionId: t.id,
            userId: userData.userId,
            type: t.type,
            amount: t.amount,
            reason: t.reason,
            timestamp: new Date(t.timestamp),
            metadata: t.metadata
          }));
          
          await Transaction.insertMany(transactions);
        }
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating StreamCoins data:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },
  
  // POST /api/streamcoins/process-referral
  processReferral: async (req, res) => {
    try {
      const { referralCode, newUserId } = req.body;
      
      // Find the referrer
      const referrer = await User.findOne({ 'streamCoins.referralCode': referralCode });
      
      if (!referrer) {
        return res.status(404).json({ error: 'Неверный реферальный код' });
      }
      
      // Find the new user
      const newUser = await User.findById(newUserId);
      if (!newUser) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      // Check if the new user already has a referrer
      if (newUser.streamCoins.referredBy) {
        return res.status(400).json({ error: 'У пользователя уже есть реферер' });
      }
      
      // Award coins to the referrer
      referrer.streamCoins.balance += 50;
      referrer.streamCoins.totalEarned += 50;
      
      // Create referral transaction
      const transaction = new Transaction({
        transactionId: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: referrer._id,
        type: 'earn',
        amount: 50,
        reason: 'referral',
        timestamp: new Date(),
        metadata: { referredUserId: newUserId }
      });
      
      // Set referrer for the new user
      newUser.streamCoins.referredBy = referralCode;
      
      // Save changes
      await Promise.all([
        referrer.save(),
        newUser.save(),
        transaction.save()
