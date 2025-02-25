import { useState, useEffect, useRef } from 'react';
import StreamCoinsManager from '../services/streamCoins';

// Custom React hook for using StreamCoins in components
export default function useStreamCoins(userId) {
  const [coinsData, setCoinsData] = useState({
    isLoading: true,
    balance: 0,
    error: null,
    transactions: []
  });
  
  const coinsManager = useRef(null);
  
  useEffect(() => {
    const initializeCoins = async () => {
      if (!userId) return;
      
      try {
        coinsManager.current = new StreamCoinsManager(userId);
        const data = await coinsManager.current.loadData();
        
        setCoinsData({
          isLoading: false,
          balance: data.balance,
          transactions: data.transactions,
          error: null
        });
      } catch (error) {
        setCoinsData({
          isLoading: false,
          balance: 0,
          transactions: [],
          error: error.message
        });
      }
    };
    
    initializeCoins();
  }, [userId]);
  
  const earnFromAd = async (adType) => {
    if (!coinsManager.current) return;
    
    try {
      await coinsManager.current.earnFromAd(adType);
      // Update state with new data
      setCoinsData({
        ...coinsData,
        balance: coinsManager.current.getBalance(),
        transactions: coinsManager.current.getTransactions()
      });
      return true;
    } catch (error) {
      console.error('Error earning from ad:', error);
      return false;
    }
  };
  
  const spendOnQuestion = async (streamerId, questionText, amount) => {
    if (!coinsManager.current) return;
    
    try {
      await coinsManager.current.spendOnQuestion(streamerId, questionText, amount);
      // Update state with new data
      setCoinsData({
        ...coinsData,
        balance: coinsManager.current.getBalance(),
        transactions: coinsManager.current.getTransactions()
      });
      return true;
    } catch (error) {
      console.error('Error spending on question:', error);
      return false;
    }
  };
  
  const spendOnRequest = async (streamerId, requestType, details, amount) => {
    if (!coinsManager.current) return;
    
    try {
      await coinsManager.current.spendOnRequest(streamerId, requestType, details, amount);
      // Update state with new data
      setCoinsData({
        ...coinsData,
        balance: coinsManager.current.getBalance(),
        transactions: coinsManager.current.getTransactions()
      });
      return true;
    } catch (error) {
      console.error('Error spending on request:', error);
      return false;
    }
  };
  
  const useReferralCode = async (referralCode) => {
    if (!coinsManager.current) return;
    
    try {
      await coinsManager.current.useReferralCode(referralCode);
      return true;
    } catch (error) {
      console.error('Error using referral code:', error);
      return false;
    }
  };
  
  return {
    ...coinsData,
    earnFromAd,
    spendOnQuestion,
    spendOnRequest,
    useReferralCode
  };
}
