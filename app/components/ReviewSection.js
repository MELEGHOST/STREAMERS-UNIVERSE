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
  const [averageRating, setAverageRating] = useState(0);

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
        // Запрос к нашему API для получения отзывов
        const response = await fetch(`/api/reviews?targetUserId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки отзывов');
        }
        
        const reviewsData = await response.json();
        console.log('Загружены отзывы:', reviewsData);
        
        setReviews(reviewsData);
        
        // Рассчитываем средний рейтинг
        if (reviewsData.length > 0) {
          const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0);
          setAverageRating((sum / reviewsData.length).toFixed(1));
        }
        
        setLoading(false);
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
      // Проверяем, авторизован ли пользователь
      if (!currentUser || !currentUser.id) {
        setError('Необходимо авторизоваться, чтобы оставить отзыв');
        return;
      }
      
      // Проверяем, не пытается ли пользователь оставить отзыв себе
      if (currentUser.id === userId) {
        setError('Вы не можете оставить отзыв самому себе');
        return;
      }
      
      // Проверяем, не оставлял ли пользователь уже отзыв для этого пользователя
      const hasExistingReview = reviews.some(review => review.authorId === currentUser.id);
      if (hasExistingReview) {
        setError('Вы уже оставили отзыв для этого пользователя');
        return;
      }
      
      // Отправляем запрос к API для сохранения отзыва
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: userId,
          text: newReview,
          rating
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при отправке отзыва');
      }
      
      const newReviewData = await response.json();
      
      // Обновляем список отзывов
      setReviews([newReviewData, ...reviews]);
      
      // Пересчитываем средний рейтинг
      const sum = [...reviews, newReviewData].reduce((acc, review) => acc + review.rating, 0);
      setAverageRating((sum / (reviews.length + 1)).toFixed(1));
      
      setNewReview('');
      setRating(5);
      setSuccessMessage('Отзыв успешно добавлен!');
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Ошибка при отправке отзыва:', err);
      setError(err.message || 'Не удалось отправить отзыв. Пожалуйста, попробуйте позже.');
      
      // Скрываем сообщение об ошибке через 5 секунд
      setTimeout(() => {
        setError(null);
      }, 5000);
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
          <p>Загрузка отзывов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reviewSection}>
      <h2>Отзывы {reviews.length > 0 && `(${reviews.length})`}</h2>
      
      {reviews.length > 0 && (
        <div className={styles.averageRating}>
          <span className={styles.ratingValue}>{averageRating}</span>
          {renderStars(Math.round(averageRating))}
          <span className={styles.reviewsCount}>{reviews.length} {getDeclension(reviews.length, ['отзыв', 'отзыва', 'отзывов'])}</span>
        </div>
      )}
      
      {/* Форма для добавления отзыва (только если пользователь не оставлял отзыв и это не его профиль) */}
      {currentUser && currentUser.id && currentUser.id !== userId && 
       !reviews.some(review => review.authorId === currentUser.id) && (
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
      )}
      
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
                    <div className={styles.reviewDate}>{formatDate(review.createdAt)}</div>
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

// Вспомогательная функция для склонения слов
function getDeclension(number, words) {
  const cases = [2, 0, 1, 1, 1, 2];
  return words[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
}

export default ReviewSection; 