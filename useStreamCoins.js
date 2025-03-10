import { useState, useEffect, useRef } from 'react';
import StreamCoinsManager from './streamCoins';

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
    if (!userId || typeof window === 'undefined') return;
    
    const initializeCoins = async () => {
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
        console.error('Error initializing StreamCoins:', error);
        setCoinsData({
          isLoading: false,
          balance: 0,
          transactions: [],
          error: error.message || 'Ошибка инициализации StreamCoins'
        });
      }
    };
    
    initializeCoins();
  }, [userId]);
  
  const earnFromAd = async (adType) => {
    if (!coinsManager.current || typeof window === 'undefined') {
      console.error('StreamCoins not initialized or running on server');
      setCoinsData(prevState => ({
        ...prevState,
        error: 'StreamCoins не инициализирован или запущен на сервере'
      }));
      return false;
    }
    
    try {
      await coinsManager.current.earnFromAd(adType);
      // Update state with new data
      setCoinsData({
        ...coinsData,
        balance: coinsManager.current.getBalance(),
        transactions: coinsManager.current.getTransactions(),
        error: null
      });
      return true;
    } catch (error) {
      console.error('Error earning from ad:', error);
      setCoinsData({
        ...coinsData,
        error: error.message || 'Ошибка при начислении монет за просмотр рекламы'
      });
      return false;
    }
  };
  
  const spendOnQuestion = async (streamerId, questionText, amount) => {
    if (!coinsManager.current || typeof window === 'undefined') {
      console.error('StreamCoins not initialized or running on server');
      setCoinsData(prevState => ({
        ...prevState,
        error: 'StreamCoins не инициализирован или запущен на сервере'
      }));
      return false;
    }
    
    try {
      await coinsManager.current.spendOnQuestion(streamerId, questionText, amount);
      // Update state with new data
      setCoinsData({
        ...coinsData,
        balance: coinsManager.current.getBalance(),
        transactions: coinsManager.current.getTransactions(),
        error: null
      });
      return true;
    } catch (error) {
      console.error('Error spending on question:', error);
      setCoinsData({
        ...coinsData,
        error: error.message || 'Ошибка при списании монет за вопрос'
      });
      return false;
    }
  };
  
  const spendOnRequest = async (streamerId, requestType, details, amount) => {
    if (!coinsManager.current || typeof window === 'undefined') {
      console.error('StreamCoins not initialized or running on server');
      setCoinsData(prevState => ({
        ...prevState,
        error: 'StreamCoins не инициализирован или запущен на сервере'
      }));
      return false;
    }
    
    try {
      await coinsManager.current.spendOnRequest(streamerId, requestType, details, amount);
      // Update state with new data
      setCoinsData({
        ...coinsData,
        balance: coinsManager.current.getBalance(),
        transactions: coinsManager.current.getTransactions(),
        error: null
      });
      return true;
    } catch (error) {
      console.error('Error spending on request:', error);
      setCoinsData({
        ...coinsData,
        error: error.message || 'Ошибка при списании монет за запрос'
      });
      return false;
    }
  };
  
  const useReferralCode = async (referralCode) => {
    if (!coinsManager.current || typeof window === 'undefined') {
      console.error('StreamCoins not initialized or running on server');
      setCoinsData(prevState => ({
        ...prevState,
        error: 'StreamCoins не инициализирован или запущен на сервере'
      }));
      return false;
    }
    
    try {
      await coinsManager.current.useReferralCode(referralCode);
      // Обновляем состояние после успешного использования реферального кода
      setCoinsData({
        ...coinsData,
        error: null
      });
      return true;
    } catch (error) {
      console.error('Error using referral code:', error);
      setCoinsData({
        ...coinsData,
        error: error.message || 'Ошибка при использовании реферального кода'
      });
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
