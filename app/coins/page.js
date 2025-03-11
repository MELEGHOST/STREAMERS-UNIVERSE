'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Image from 'next/image';
import styles from './coins.module.css';
import { DataStorage } from '../utils/dataStorage';

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
    if (!DataStorage.isAuthenticated()) {
      router.push('/auth');
      return;
    }

    // Загружаем данные пользователя
    const loadUserData = async () => {
      try {
        const userData = await DataStorage.getData('user');
        if (userData && userData.id) {
          setUserData(userData);
          
          // Загружаем данные о коинах
          loadCoinsData(userData.id);
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
      // Используем только внутри useEffect, чтобы избежать проблем с SSR
      const coinsDataKey = `streamcoins_${userId}`;
      DataStorage.getData(coinsDataKey)
        .then(storedData => {
          if (storedData) {
            setCoinsData({
              balance: storedData.balance || 0,
              transactions: storedData.transactions || [],
              lastDailyBonus: storedData.lastDailyBonus || null
            });
            
            // Проверяем доступность ежедневного бонуса
            checkDailyBonusAvailability(storedData.lastDailyBonus);
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
            
            DataStorage.saveData(coinsDataKey, initialData);
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
        })
        .catch(error => {
          console.error('Ошибка при загрузке данных о коинах:', error);
          setError('Произошла ошибка при загрузке данных о коинах');
          setLoading(false);
        });
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
    if (!userId) return 'STREAMER-CODE';
    
    try {
      const base = userId.substring(0, 5);
      const randomPart = Math.random().toString(36).substring(2, 6);
      return `${base}-${randomPart}`.toUpperCase();
    } catch (error) {
      console.error('Ошибка при генерации реферального кода:', error);
      return `STREAMER-${Date.now().toString(36).substring(-4)}`;
    }
  };

  // Функция для получения ежедневного бонуса
  const claimDailyBonus = () => {
    if (!bonusAvailable || !userData) return;
    
    try {
      // Получаем текущие данные о коинах
      const coinsDataKey = `data_streamcoins_${userData.id}`;
      
      DataStorage.getData(coinsDataKey)
        .then(storedData => {
          if (storedData) {
            // Создаем обновленные данные
            const updatedData = { ...storedData };
            
            // Устанавливаем баланс в 100 коинов (не добавляем, а заменяем)
            updatedData.balance = 100;
            
            // Увеличиваем общее количество заработанных коинов
            updatedData.totalEarned = (updatedData.totalEarned || 0) + 100;
            
            // Добавляем транзакцию
            const transaction = {
              id: `daily-${Date.now()}`,
              type: 'earn',
              amount: 100,
              reason: 'daily_bonus',
              timestamp: new Date().toISOString(),
              metadata: { note: 'Ежедневный бонус альфа-тестера' }
            };
            
            updatedData.transactions = [transaction, ...(updatedData.transactions || [])];
            
            // Обновляем дату последнего бонуса
            updatedData.lastDailyBonus = new Date().toISOString();
            
            // Сохраняем обновленные данные
            DataStorage.saveData(coinsDataKey, updatedData);
            
            // Также обновляем данные в старом формате для совместимости с меню
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem(`streamcoins_${userData.id}`, '100');
            }
            
            // Обновляем состояние
            setCoinsData({
              balance: updatedData.balance,
              transactions: updatedData.transactions,
              lastDailyBonus: updatedData.lastDailyBonus
            });
            
            // Обновляем доступность бонуса
            setBonusAvailable(false);
            setBonusMessage('Вы успешно получили 100 стример-коинов! Следующий бонус будет доступен завтра в 00:00 по МСК.');
          }
        })
        .catch(error => {
          console.error('Ошибка при получении ежедневного бонуса:', error);
          setError('Произошла ошибка при получении бонуса');
        });
    } catch (error) {
      console.error('Ошибка при получении ежедневного бонуса:', error);
      setError('Произошла ошибка при получении бонуса');
    }
  };

  const handleReturnToMenu = () => {
    router.push('/menu');
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
        <button className={styles.button} onClick={handleReturnToMenu}>
          Вернуться в меню
        </button>
      </div>
    );
  }

  return (
    <div className={styles.coinsContainer}>
      <div className={styles.header}>
        <button onClick={handleReturnToMenu} className={styles.returnButton}>
          <span>←</span> Вернуться в меню
        </button>
        <h1 className={styles.title}>Стример-коины</h1>
      </div>
      
      <div className={styles.balanceCard}>
        <div className={styles.balanceHeader}>
          <div className={styles.coinIconLarge}>💰</div>
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
                  <span className={styles.transactionAmount}>
                    {transaction.type === 'earn' ? '+' : '-'}{transaction.amount}
                  </span>
                </div>
                <div className={styles.transactionDate}>
                  {new Date(transaction.timestamp).toLocaleString('ru-RU')}
                </div>
                <div className={styles.transactionReason}>
                  {transaction.reason === 'daily_bonus' ? 'Ежедневный бонус' : 
                   transaction.reason === 'referral' ? 'Реферальная награда' : 
                   transaction.reason === 'purchase' ? 'Покупка' : 'Операция'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noTransactions}>У вас пока нет транзакций.</p>
        )}
      </div>
      
      <div className={styles.infoCard}>
        <h2>Информация о стример-коинах</h2>
        <p>
          Стример-коины — это внутренняя валюта платформы, которая используется для различных функций:
        </p>
        <ul>
          <li>Разблокировка эксклюзивного контента</li>
          <li>Поддержка любимых стримеров</li>
          <li>Получение дополнительных возможностей</li>
        </ul>
        <p className={styles.alphaNote}>
          Сейчас проходит альфа-тестирование, и вы можете получать 100 коинов каждый день бесплатно!
        </p>
      </div>
    </div>
  );
} 