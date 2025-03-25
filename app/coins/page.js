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
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const [showPurchaseMessage, setShowPurchaseMessage] = useState(false);

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
      // Ключи для всех возможных мест хранения данных о коинах
      const coinsKeys = [
        `streamcoins_${userId}`,
        `data_streamcoins_${userId}`
      ];
      
      let foundCoins = null;
      
      // Ищем данные в всех возможных местах
      for (const key of coinsKeys) {
        const coinsData = DataStorage.getData(key);
        if (coinsData) {
          foundCoins = coinsData;
          console.log('Найдены данные о монетах:', key, coinsData);
          break;
        }
      }
      
      if (foundCoins) {
        console.log('Загруженные данные о монетах:', foundCoins);
        
        // Если данные представлены как строка, это может быть просто баланс
        if (typeof foundCoins === 'string') {
          const balance = parseInt(foundCoins, 10) || 0;
          console.log('Баланс из строки:', balance);
          
          setCoinsData({
            balance: balance,
            transactions: [],
            lastDailyBonus: null
          });
          
          // Сохраняем данные в стандартном формате
          const standardData = {
            userId: userId,
            balance: balance,
            totalEarned: balance,
            totalSpent: 0,
            transactions: [],
            lastDailyBonus: null,
            lastAdWatch: new Date(0).toISOString(),
            referralCode: generateReferralCode(userId),
            referredBy: null
          };
          
          DataStorage.saveData(`data_streamcoins_${userId}`, standardData);
          
          // Проверяем доступность ежедневного бонуса
          checkDailyBonusAvailability(null);
        } else {
          // Данные в стандартном формате объекта
          console.log('Баланс из объекта:', foundCoins.balance);
          
          setCoinsData({
            balance: foundCoins.balance || 0,
            transactions: foundCoins.transactions || [],
            lastDailyBonus: foundCoins.lastDailyBonus || null
          });
          
          // Проверяем доступность ежедневного бонуса
          checkDailyBonusAvailability(foundCoins.lastDailyBonus);
        }
      } else {
        // Если данных нет, создаем начальные данные
        console.log('Данные о монетах не найдены, создаю начальные данные');
        
        const initialData = {
          userId: userId,
          balance: 100, // Даем 100 монет новому пользователю
          totalEarned: 100,
          totalSpent: 0,
          transactions: [{
            id: generateUUID(),
            amount: 100,
            type: 'earn',
            description: 'Начальные монеты',
            timestamp: new Date().toISOString()
          }],
          lastDailyBonus: null,
          lastAdWatch: new Date(0).toISOString(),
          referralCode: generateReferralCode(userId),
          referredBy: null
        };
        
        setCoinsData({
          balance: initialData.balance,
          transactions: initialData.transactions,
          lastDailyBonus: initialData.lastDailyBonus
        });
        
        // Сохраняем начальные данные
        DataStorage.saveData(`data_streamcoins_${userId}`, initialData);
        
        // Также сохраняем для совместимости со старым форматом
        DataStorage.saveData(`streamcoins_${userId}`, initialData.balance.toString());
        
        // Бонус доступен для нового пользователя
        setBonusAvailable(true);
        setBonusMessage('Получите ваш первый ежедневный бонус!');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке данных о монетах:', error);
      setError('Произошла ошибка при загрузке данных о монетах');
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

  // Функция для генерации UUID (для транзакций)
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Функция для генерации реферального кода
  const generateReferralCode = (userId) => {
    // Генерируем 8-символьный код на основе ID пользователя и случайных чисел
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    // Берем первые 4 символа из ID пользователя
    const userPart = userId ? userId.substring(0, 4).toUpperCase() : 'USER';
    return `${userPart}${randomPart}`;
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

  // Функция для покупки предмета
  const purchaseItem = (itemId, price, itemName) => {
    if (!userData || coinsData.balance < price) {
      setPurchaseMessage('Недостаточно стример-коинов для покупки!');
      setShowPurchaseMessage(true);
      setTimeout(() => setShowPurchaseMessage(false), 3000);
      return;
    }
    
    try {
      // Получаем текущие данные о коинах
      const coinsDataKey = `data_streamcoins_${userData.id}`;
      
      DataStorage.getData(coinsDataKey)
        .then(storedData => {
          if (storedData) {
            // Создаем обновленные данные
            const updatedData = { ...storedData };
            
            // Вычитаем стоимость предмета
            const newBalance = updatedData.balance - price;
            updatedData.balance = newBalance;
            
            // Увеличиваем общее количество потраченных коинов
            updatedData.totalSpent = (updatedData.totalSpent || 0) + price;
            
            // Добавляем транзакцию
            const transaction = {
              id: `purchase-${Date.now()}`,
              type: 'spend',
              amount: price,
              reason: 'item_purchase',
              timestamp: new Date().toISOString(),
              metadata: { note: `Покупка: ${itemName}`, itemId }
            };
            
            updatedData.transactions = [transaction, ...(updatedData.transactions || [])];
            
            // Сохраняем обновленные данные
            DataStorage.saveData(coinsDataKey, updatedData);
            
            // Также обновляем данные в старом формате для совместимости с меню
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem(`streamcoins_${userData.id}`, newBalance.toString());
            }
            
            // Обновляем состояние
            setCoinsData({
              balance: newBalance,
              transactions: updatedData.transactions,
              lastDailyBonus: updatedData.lastDailyBonus
            });
            
            // Показываем сообщение об успешной покупке
            setPurchaseMessage(`Вы успешно приобрели ${itemName}!`);
            setShowPurchaseMessage(true);
            setTimeout(() => setShowPurchaseMessage(false), 3000);
          }
        })
        .catch(error => {
          console.error('Ошибка при покупке предмета:', error);
          setPurchaseMessage('Произошла ошибка при покупке предмета');
          setShowPurchaseMessage(true);
          setTimeout(() => setShowPurchaseMessage(false), 3000);
        });
    } catch (error) {
      console.error('Ошибка при покупке предмета:', error);
      setPurchaseMessage('Произошла ошибка при покупке предмета');
      setShowPurchaseMessage(true);
      setTimeout(() => setShowPurchaseMessage(false), 3000);
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
      
      <div className={styles.shopCard}>
        <h2>Магазин</h2>
        <p>Приобретайте эксклюзивные предметы за стример-коины:</p>
        
        <div className={styles.shopItems}>
          <div className={styles.shopItem}>
            <div className={styles.itemIcon}>🌟</div>
            <div className={styles.itemInfo}>
              <h3>VIP-статус на стриме</h3>
              <p>Получите VIP-значок и подсветку вашего ника на стримах</p>
              <div className={styles.itemPrice}>
                <span>50</span>
                <div className={styles.smallCoinIcon}>💰</div>
              </div>
            </div>
            <button 
              className={styles.purchaseButton}
              onClick={() => purchaseItem('vip-status', 50, 'VIP-статус на стриме')}
              disabled={coinsData.balance < 50}
            >
              Купить
            </button>
          </div>
        </div>
        
        {showPurchaseMessage && (
          <div className={styles.purchaseMessage}>
            {purchaseMessage}
          </div>
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