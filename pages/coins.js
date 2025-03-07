'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import styles from './coins.module.css';

export default function StreamerCoins() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [coinsData, setCoinsData] = useState({
    balance: 0,
    transactions: [],
    lastDailyBonus: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bonusAvailable, setBonusAvailable] = useState(false);
  const [bonusMessage, setBonusMessage] = useState('');

  useEffect(() => {
    // Проверяем авторизацию
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      router.push('/auth');
      return;
    }

    // Загружаем данные пользователя
    const loadUserData = async () => {
      try {
        const storedUser = localStorage.getItem('twitch_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserData(parsedUser);
          
          // Загружаем данные о коинах
          loadCoinsData(parsedUser.id);
        } else {
          setError('Не удалось загрузить данные пользователя');
          setLoading(false);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
        setError('Произошла ошибка при загрузке данных');
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  // Функция для загрузки данных о коинах
  const loadCoinsData = (userId) => {
    try {
      // Проверяем наличие данных о коинах в localStorage
      const coinsDataStr = localStorage.getItem(`streamcoins_${userId}`);
      if (coinsDataStr) {
        const parsedData = JSON.parse(coinsDataStr);
        setCoinsData({
          balance: parsedData.balance || 0,
          transactions: parsedData.transactions || [],
          lastDailyBonus: parsedData.lastDailyBonus || null
        });
        
        // Проверяем доступность ежедневного бонуса
        checkDailyBonusAvailability(parsedData.lastDailyBonus);
      } else {
        // Если данных нет, создаем начальные данные
        const initialData = {
          userId: userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          transactions: [],
          lastDailyBonus: null,
          lastAdWatch: new Date(0).toISOString(),
          referralCode: generateReferralCode(userId),
          referredBy: null
        };
        
        localStorage.setItem(`streamcoins_${userId}`, JSON.stringify(initialData));
        setCoinsData({
          balance: 0,
          transactions: [],
          lastDailyBonus: null
        });
        
        // Бонус доступен для новых пользователей
        setBonusAvailable(true);
        setBonusMessage('Вы участвуете в альфа-тестировании, вам доступны 100 стример-коинов в день!');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке данных о коинах:', error);
      setError('Произошла ошибка при загрузке данных о коинах');
      setLoading(false);
    }
  };

  // Функция для проверки доступности ежедневного бонуса
  const checkDailyBonusAvailability = (lastBonusDate) => {
    if (!lastBonusDate) {
      // Если бонус никогда не получали
      setBonusAvailable(true);
      setBonusMessage('Вы участвуете в альфа-тестировании, вам доступны 100 стример-коинов в день!');
      return;
    }
    
    const now = new Date();
    const lastBonus = new Date(lastBonusDate);
    
    // Проверяем, наступила ли новая дата по МСК (UTC+3)
    const mskOffset = 3 * 60 * 60 * 1000; // 3 часа в миллисекундах
    
    const nowMsk = new Date(now.getTime() + mskOffset);
    const lastBonusMsk = new Date(lastBonus.getTime() + mskOffset);
    
    // Сбрасываем время до 00:00
    nowMsk.setUTCHours(0, 0, 0, 0);
    lastBonusMsk.setUTCHours(0, 0, 0, 0);
    
    // Если даты разные, значит наступил новый день
    if (nowMsk.getTime() > lastBonusMsk.getTime()) {
      setBonusAvailable(true);
      setBonusMessage('Вы участвуете в альфа-тестировании, вам доступны 100 стример-коинов в день!');
    } else {
      setBonusAvailable(false);
      setBonusMessage('Вы уже получили сегодняшний бонус. Следующий бонус будет доступен завтра в 00:00 по МСК.');
    }
  };

  // Функция для генерации реферального кода
  const generateReferralCode = (userId) => {
    const base = userId.substring(0, 5);
    const randomPart = Math.random().toString(36).substring(2, 6);
    return `${base}-${randomPart}`.toUpperCase();
  };

  // Функция для получения ежедневного бонуса
  const claimDailyBonus = () => {
    if (!bonusAvailable || !userData) return;
    
    try {
      // Получаем текущие данные о коинах
      const coinsDataStr = localStorage.getItem(`streamcoins_${userData.id}`);
      if (coinsDataStr) {
        const parsedData = JSON.parse(coinsDataStr);
        
        // Устанавливаем баланс в 100 коинов
        parsedData.balance = 100;
        
        // Увеличиваем общее количество заработанных коинов
        parsedData.totalEarned = (parsedData.totalEarned || 0) + 100;
        
        // Добавляем транзакцию
        const transaction = {
          id: `daily-${Date.now()}`,
          type: 'earn',
          amount: 100,
          reason: 'daily_bonus',
          timestamp: new Date().toISOString(),
          metadata: { note: 'Ежедневный бонус альфа-тестера' }
        };
        
        parsedData.transactions = [transaction, ...(parsedData.transactions || [])];
        
        // Обновляем дату последнего бонуса
        parsedData.lastDailyBonus = new Date().toISOString();
        
        // Сохраняем обновленные данные
        localStorage.setItem(`streamcoins_${userData.id}`, JSON.stringify(parsedData));
        
        // Обновляем состояние
        setCoinsData({
          balance: parsedData.balance,
          transactions: parsedData.transactions,
          lastDailyBonus: parsedData.lastDailyBonus
        });
        
        // Обновляем доступность бонуса
        setBonusAvailable(false);
        setBonusMessage('Вы успешно получили 100 стример-коинов! Следующий бонус будет доступен завтра в 00:00 по МСК.');
      }
    } catch (error) {
      console.error('Ошибка при получении ежедневного бонуса:', error);
      setError('Произошла ошибка при получении бонуса');
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button className={styles.button} onClick={() => router.push('/menu')}>
          Вернуться в меню
        </button>
      </div>
    );
  }

  return (
    <div className={styles.coinsContainer}>
      <h1>Стример-коины</h1>
      
      <div className={styles.balanceCard}>
        <div className={styles.balanceHeader}>
          <img 
            src="/images/stream-coin.svg" 
            alt="Stream Coins" 
            className={styles.coinIconLarge} 
          />
          <h2>Ваш баланс</h2>
        </div>
        <div className={styles.balanceAmount}>{coinsData.balance}</div>
      </div>
      
      <div className={styles.bonusCard}>
        <h2>Ежедневный бонус</h2>
        <p>{bonusMessage}</p>
        {bonusAvailable && (
          <button 
            className={styles.claimButton}
            onClick={claimDailyBonus}
          >
            Получить 100 коинов
          </button>
        )}
      </div>
      
      <div className={styles.transactionsCard}>
        <h2>История транзакций</h2>
        {coinsData.transactions.length > 0 ? (
          <div className={styles.transactionsList}>
            {coinsData.transactions.map(transaction => (
              <div key={transaction.id} className={styles.transactionItem}>
                <div className={styles.transactionInfo}>
                  <span className={styles.transactionType}>
                    {transaction.type === 'earn' ? '📈 Получено' : '📉 Потрачено'}
                  </span>
                  <span className={styles.transactionReason}>
                    {transaction.reason === 'daily_bonus' ? 'Ежедневный бонус' : 
                     transaction.reason === 'initial' ? 'Начальные коины' : 
                     transaction.reason}
                  </span>
                </div>
                <div className={styles.transactionAmount}>
                  {transaction.type === 'earn' ? '+' : '-'}{transaction.amount}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>У вас пока нет транзакций</p>
        )}
      </div>
      
      <button className={styles.button} onClick={() => router.push('/menu')}>
        Вернуться в меню
      </button>
    </div>
  );
} 