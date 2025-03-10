'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './reviews.module.css';
import ReviewCategories from '../components/ReviewCategories';
import Link from 'next/link';
import { DataStorage } from '../utils/dataStorage';

// Импортируем категории из компонента ReviewCategories
import { categories } from '../components/ReviewCategories';

export default function Reviews() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Проверяем авторизацию
        const isAuth = DataStorage.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (!isAuth) {
          // Если не авторизован, перенаправляем на страницу логина
          router.push('/login');
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleReturnToMenu = () => {
    router.push('/menu');
  };

  const openWriteReviewModal = (categoryData = null) => {
    setShowModal(true);
    
    // Если переданы данные о категории, предварительно заполняем форму
    if (categoryData && categoryData.category) {
      setSelectedCategory(categoryData.category);
      
      if (categoryData.subcategory) {
        setSelectedSubcategory(categoryData.subcategory);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleReturnToMenu} className={styles.returnButton}>
          <span className={styles.returnIcon}>←</span>
          Вернуться в меню
        </button>
        <h1 className={styles.title}>Отзывы обо всём</h1>
      </div>
      
      <p className={styles.description}>
        Здесь собраны отзывы пользователей обо всём, что существует в этом мире: 
        от техники для стримеров до онлайн-сервисов, игр, мебели и многого другого.
        Выберите категорию, чтобы просмотреть отзывы или добавить свой.
      </p>
      
      <button onClick={openWriteReviewModal} className={styles.writeReviewButton}>
        <span className={styles.buttonIcon}>✏️</span>
        Написать отзыв
      </button>
      
      <ReviewCategories onWriteReview={openWriteReviewModal} />
      
      <div className={styles.infoSection}>
        <h2 className={styles.infoTitle}>Как это работает?</h2>
        <div className={styles.infoBlocks}>
          <div className={styles.infoBlock}>
            <div className={styles.infoIcon}>📝</div>
            <h3>Разнообразные отзывы</h3>
            <p>Все отзывы оставлены реальными пользователями и охватывают любые товары, сервисы и продукты.</p>
          </div>
          <div className={styles.infoBlock}>
            <div className={styles.infoIcon}>🔎</div>
            <h3>Честные мнения</h3>
            <p>Мы не редактируем отзывы и показываем как положительные, так и отрицательные стороны.</p>
          </div>
          <div className={styles.infoBlock}>
            <div className={styles.infoIcon}>🌍</div>
            <h3>Всё что угодно</h3>
            <p>От техники и игр до мебели и сервисов - вы можете оставить или найти отзыв о чём угодно!</p>
          </div>
        </div>
      </div>
      
      {/* Модальное окно для написания отзыва */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.writeReviewModal}>
            <div className={styles.modalHeader}>
              <h2>Написать отзыв</h2>
              <button onClick={closeModal} className={styles.closeButton}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label>Категория</label>
                <select 
                  className={styles.selectField}
                  value={selectedCategory ? selectedCategory.id : ""}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setSelectedCategory(cat);
                    setSelectedSubcategory(null);
                  }}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              {selectedCategory && (
                <div className={styles.formGroup}>
                  <label>Подкатегория</label>
                  <select 
                    className={styles.selectField}
                    value={selectedSubcategory ? selectedSubcategory.id : ""}
                    onChange={(e) => {
                      const subcat = selectedCategory.subcategories.find(sc => sc.id === e.target.value);
                      setSelectedSubcategory(subcat);
                    }}
                  >
                    <option value="">Выберите подкатегорию</option>
                    {selectedCategory.subcategories.map(subcat => (
                      <option key={subcat.id} value={subcat.id}>{subcat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className={styles.formGroup}>
                <label>Название товара или услуги</label>
                <input type="text" className={styles.inputField} placeholder="Например: Logitech G Pro X" />
              </div>
              <div className={styles.formGroup}>
                <label>Оценка</label>
                <div className={styles.ratingSelector}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={styles.ratingStar}>★</span>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Отзыв</label>
                <textarea 
                  className={styles.textareaField} 
                  placeholder="Поделитесь своим опытом использования..."
                  rows="5"
                ></textarea>
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelButton} onClick={closeModal}>Отмена</button>
                <button className={styles.submitButton}>Опубликовать</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 