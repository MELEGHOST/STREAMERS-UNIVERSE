'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './MenuHeader.module.css';

const CoinDisplay = ({ userId }) => {
  const [streamCoins, setStreamCoins] = useState(100);
  const router = useRouter();
  
  const loadStreamCoins = useCallback(() => {
    try {
      if (!userId) {
        console.error('Ошибка при загрузке стример-коинов: userId не определен');
        setStreamCoins(100);
        return;
      }
      
      // Безопасное получение данных из localStorage
      const safeGetFromStorage = (key) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem(key);
        }
        return null;
      };
      
      // Проверяем как новый формат данных о коинах, так и старый
      const coinsDataKey = `data_streamcoins_${userId}`;
      const oldCoinsKey = `streamcoins_${userId}`;
      
      // Сначала проверяем новый формат
      const storedCoinsData = safeGetFromStorage(coinsDataKey);
      if (storedCoinsData) {
        try {
          const parsedData = JSON.parse(storedCoinsData);
          if (parsedData && typeof parsedData.balance === 'number') {
            setStreamCoins(parsedData.balance);
            return;
          }
        } catch (e) {
          console.warn('Ошибка при парсинге данных о коинах из нового формата:', e);
        }
      }
      
      // Если новый формат не найден, проверяем старый
      const storedCoins = safeGetFromStorage(oldCoinsKey);
      if (storedCoins && !isNaN(parseInt(storedCoins, 10))) {
        setStreamCoins(parseInt(storedCoins, 10));
      } else {
        // Значение по умолчанию
        setStreamCoins(100);
      }
    } catch (error) {
      console.error('Ошибка при загрузке стример-коинов:', error);
      setStreamCoins(100);
    }
  }, [userId]);
  
  useEffect(() => {
    loadStreamCoins();
  }, [loadStreamCoins]);
  
  // Функция для перехода на страницу коинов
  const goToCoinsPage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push('/coins');
  };
  
  return (
    <div className={styles.guestCoinContainer} onClick={goToCoinsPage} title="Перейти к Stream-коинам">
      <div className={styles.coinIcon}>
        S
      </div>
      <span className={styles.coinAmount}>{streamCoins}</span>
    </div>
  );
};

export default CoinDisplay; 