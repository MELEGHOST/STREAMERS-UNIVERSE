'use client';

import React, { useEffect, useState /*, useCallback */ } from 'react';
import { useRouter } from 'next/navigation';
import styles from './reviews.module.css';
import ReviewCategories from '../components/ReviewCategories';
// import Link from 'next/link'; // Удаляем неиспользуемый импорт
import { DataStorage } from '../utils/dataStorage';
import { useAuth } from '../../contexts/AuthContext';
// import supabase from '../../lib/supabaseClient'; // Удаляем неиспользуемый импорт

// Импортируем категории из компонента ReviewCategories
import { categories } from '../components/ReviewCategories';

export default function Reviews() {
  const { /* Удаляем userId */ /* Удаляем isAuthenticated */ } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [productName, setProductName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Проверяем авторизацию
        const isAuth = DataStorage.isAuthenticated();
        
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
    // Сбрасываем форму
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setRating(0);
    setHoverRating(0);
    setProductName('');
    setReviewText('');
    setSubmitError('');
    setFormErrors({});
  };

  const handleRatingClick = (starIndex) => {
    setRating(starIndex);
  };

  const handleMouseEnter = (starIndex) => {
    setHoverRating(starIndex);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const validateForm = () => {
    const errors = {};
    if (!selectedCategory) {
      errors.category = 'Выберите категорию';
    }
    
    if (selectedCategory && !selectedSubcategory) {
      errors.subcategory = 'Выберите подкатегорию';
    }
    
    if (!productName.trim()) {
      errors.productName = 'Введите название товара или услуги';
    }
    
    if (rating === 0) {
      errors.rating = 'Поставьте оценку (от 1 до 5 звезд)';
    }
    
    if (!reviewText.trim() || reviewText.length < 10) {
      errors.reviewText = 'Напишите отзыв (минимум 10 символов)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitReview = async () => {
    setSubmitError('');
    setFormErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Получаем данные пользователя
      const userData = await DataStorage.getData('user');
      
      if (!userData || !userData.id) {
        setSubmitError('Необходимо авторизоваться для публикации отзыва');
        setSubmitting(false);
        return;
      }

      // Готовим данные для отправки на сервер
      const reviewData = {
        category: selectedCategory.id,
        subcategory: selectedSubcategory.id,
        targetName: productName,
        rating,
        content: reviewText,
        authorId: userData.id
      };
      
      // Отправляем данные на сервер
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Ошибка при публикации отзыва:', data.error);
        setSubmitError(data.error || 'Произошла ошибка при публикации отзыва. Пожалуйста, попробуйте еще раз.');
        setSubmitting(false);
        return;
      }
      
      // Успешно опубликовано
      alert('Ваш отзыв успешно опубликован!');
      closeModal();
      
    } catch (error) {
      console.error('Ошибка при публикации отзыва:', error);
      setSubmitError('Произошла ошибка при публикации отзыва. Пожалуйста, попробуйте еще раз.');
    } finally {
      setSubmitting(false);
    }
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
        от техники и гаджетов до онлайн-сервисов, игр, мебели и многого другого.
        Любой пользователь может оставить свой отзыв. Выберите категорию, чтобы просмотреть отзывы или добавить свой.
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
            <div className={styles.infoIcon}>🏆</div>
            <h3>Личный тир-лист</h3>
            <p>После публикации 5 или более отзывов в одной подкатегории формируется ваш личный тир-лист, который можно редактировать и делиться им.</p>
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
              {submitError && (
                <div className={`${styles.errorMessage} ${styles.generalErrorMessage}`}>
                  {submitError}
                </div>
              )}
              
              <div className={styles.formGroup}>
                <label>Категория</label>
                <select 
                  className={`${styles.selectField} ${formErrors.category ? styles.errorInput : ''}`}
                  value={selectedCategory ? selectedCategory.id : ""}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setSelectedCategory(cat);
                    setSelectedSubcategory(null);
                    setFormErrors(prev => ({...prev, category: '', subcategory: ''}));
                  }}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {formErrors.category && <span className={styles.fieldError}>{formErrors.category}</span>}
              </div>
              
              {selectedCategory && (
                <div className={styles.formGroup}>
                  <label>Подкатегория</label>
                  <select 
                    className={`${styles.selectField} ${formErrors.subcategory ? styles.errorInput : ''}`}
                    value={selectedSubcategory ? selectedSubcategory.id : ""}
                    onChange={(e) => {
                      const subcat = selectedCategory.subcategories.find(sc => sc.id === e.target.value);
                      setSelectedSubcategory(subcat);
                      setFormErrors(prev => ({...prev, subcategory: ''}));
                    }}
                    disabled={!selectedCategory}
                  >
                    <option value="">Выберите подкатегорию</option>
                    {selectedCategory.subcategories.map(subcat => (
                      <option key={subcat.id} value={subcat.id}>{subcat.name}</option>
                    ))}
                  </select>
                  {formErrors.subcategory && <span className={styles.fieldError}>{formErrors.subcategory}</span>}
                </div>
              )}
              
              <div className={styles.formGroup}>
                <label>Название товара или услуги</label>
                <input 
                  type="text" 
                  className={`${styles.inputField} ${formErrors.productName ? styles.errorInput : ''}`} 
                  placeholder="Например: Logitech G Pro X" 
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    setFormErrors(prev => ({...prev, productName: ''}));
                  }}
                />
                {formErrors.productName && <span className={styles.fieldError}>{formErrors.productName}</span>}
              </div>
              <div className={styles.formGroup}>
                <label>Оценка</label>
                <div className={`${styles.ratingSelector} ${formErrors.rating ? styles.errorRating : ''}`}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span 
                      key={star} 
                      className={`${styles.ratingStar} ${(hoverRating || rating) >= star ? styles.active : ''}`}
                      onClick={() => {
                        handleRatingClick(star);
                        setFormErrors(prev => ({...prev, rating: ''}));
                      }}
                      onMouseEnter={() => handleMouseEnter(star)}
                      onMouseLeave={handleMouseLeave}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {formErrors.rating && <span className={styles.fieldError}>{formErrors.rating}</span>}
              </div>
              <div className={styles.formGroup}>
                <label>Отзыв</label>
                <textarea 
                  className={`${styles.textareaField} ${formErrors.reviewText ? styles.errorInput : ''}`} 
                  placeholder="Поделитесь своим опытом использования..."
                  rows="5"
                  value={reviewText}
                  onChange={(e) => {
                    setReviewText(e.target.value);
                    setFormErrors(prev => ({...prev, reviewText: ''}));
                  }}
                ></textarea>
                {formErrors.reviewText && <span className={styles.fieldError}>{formErrors.reviewText}</span>}
              </div>
              <div className={styles.formActions}>
                <button 
                  className={styles.cancelButton} 
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Отмена
                </button>
                <button 
                  className={styles.submitButton}
                  onClick={submitReview}
                  disabled={submitting}
                >
                  {submitting ? 'Публикация...' : 'Опубликовать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 