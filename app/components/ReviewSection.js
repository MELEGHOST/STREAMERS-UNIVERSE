'use client';

import React, { useState, useEffect } from 'react';
import styles from './ReviewSection.module.css';

const ReviewSection = ({ userId }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Загрузка текущего пользователя из localStorage
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      setCurrentUser(userData);
    } catch (error) {
      console.error('Ошибка при загрузке данных пользователя:', error);
    }
  }, []);

  // Загрузка отзывов
  useEffect(() => {
    if (!userId) return;
    
    const fetchReviews = async () => {
      try {
        setLoading(true);
        // Здесь должен быть запрос к API для получения отзывов
        // Пока используем моковые данные
        const mockReviews = [
          { 
            id: 1, 
            userId: 'user1', 
            authorId: 'author1', 
            authorName: 'Стример123', 
            authorImage: '/default-avatar.png',
            text: 'Отличный стример! Всегда интересный контент и взаимодействие с аудиторией.', 
            rating: 5, 
            date: new Date(2023, 5, 15).toISOString() 
          },
          { 
            id: 2, 
            userId: 'user1', 
            authorId: 'author2', 
            authorName: 'Геймер2000', 
            authorImage: '/default-avatar.png',
            text: 'Хорошие стримы, но иногда бывают технические проблемы.', 
            rating: 4, 
            date: new Date(2023, 6, 20).toISOString() 
          },
        ];
        
        setTimeout(() => {
          setReviews(mockReviews);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Ошибка при загрузке отзывов:', err);
        setError('Не удалось загрузить отзывы. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };

    fetchReviews();
  }, [userId]);

  // Отправка нового отзыва
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!newReview.trim()) {
      setError('Пожалуйста, введите текст отзыва');
      return;
    }
    
    try {
      // Здесь должен быть запрос к API для сохранения отзыва
      // Пока просто добавляем в локальный стейт
      const newReviewObj = {
        id: Date.now(),
        userId,
        authorId: currentUser?.id || 'unknown',
        authorName: currentUser?.display_name || 'Аноним',
        authorImage: currentUser?.profile_image_url || '/default-avatar.png',
        text: newReview,
        rating,
        date: new Date().toISOString()
      };
      
      setReviews([newReviewObj, ...reviews]);
      setNewReview('');
      setRating(5);
      setSuccessMessage('Отзыв успешно добавлен!');
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Ошибка при отправке отзыва:', err);
      setError('Не удалось отправить отзыв. Пожалуйста, попробуйте позже.');
    }
  };

  // Рендеринг звездочек для рейтинга
  const renderStars = (count, isInput = false) => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span 
          key={i} 
          className={`${styles.star} ${i <= count ? styles.filled : ''}`}
          onClick={isInput ? () => setRating(i) : undefined}
          style={{ cursor: isInput ? 'pointer' : 'default' }}
        >
          ★
        </span>
      );
    }
    
    return <div className={styles.stars}>{stars}</div>;
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className={styles.reviewSection}>
        <h2>Отзывы</h2>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка отзывов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reviewSection}>
      <h2>Отзывы</h2>
      
      {/* Форма для добавления отзыва */}
      <form className={styles.reviewForm} onSubmit={handleSubmitReview}>
        <div className={styles.ratingInput}>
          <label>Ваша оценка:</label>
          {renderStars(rating, true)}
        </div>
        
        <div className={styles.textareaContainer}>
          <textarea
            className={styles.reviewTextarea}
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            placeholder="Напишите ваш отзыв..."
            maxLength={500}
          />
          <div className={styles.charCount}>
            {newReview.length}/500
          </div>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        {successMessage && <div className={styles.success}>{successMessage}</div>}
        
        <button type="submit" className={styles.submitButton}>
          Отправить отзыв
        </button>
      </form>
      
      {/* Список отзывов */}
      <div className={styles.reviewsList}>
        {reviews.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Пока нет отзывов. Будьте первым, кто оставит отзыв!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className={styles.reviewItem}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewAuthor}>
                  <img 
                    src={review.authorImage} 
                    alt={review.authorName} 
                    className={styles.authorAvatar}
                  />
                  <div className={styles.authorInfo}>
                    <div className={styles.authorName}>{review.authorName}</div>
                    <div className={styles.reviewDate}>{formatDate(review.date)}</div>
                  </div>
                </div>
                <div className={styles.reviewRating}>
                  {renderStars(review.rating)}
                </div>
              </div>
              <div className={styles.reviewText}>{review.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewSection; 