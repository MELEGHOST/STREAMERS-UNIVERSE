'use client';

import React, { useState, useEffect } from 'react';
import styles from './ReviewSection.module.css';
import Cookies from 'js-cookie';

const ReviewSection = ({ userId, onReviewAdded }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [averageRating, setAverageRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([
    { id: 'friendly', name: 'Дружелюбный', selected: false },
    { id: 'helpful', name: 'Полезный', selected: false },
    { id: 'knowledgeable', name: 'Знающий', selected: false },
    { id: 'entertaining', name: 'Развлекательный', selected: false },
    { id: 'professional', name: 'Профессиональный', selected: false },
    { id: 'creative', name: 'Креативный', selected: false },
  ]);

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
    
    fetchReviews();
  }, [userId]);

  // Выносим функцию fetchReviews за пределы useEffect для возможности повторного использования
  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      // Проверяем наличие токена
      const accessToken = Cookies.get('twitch_access_token');
      if (!accessToken) {
        console.warn('Отсутствует токен доступа для загрузки отзывов');
        // Продолжаем загрузку без токена, так как отзывы могут быть публичными
      }
      
      // Запрос к нашему API для получения отзывов
      const response = await fetch(`/api/reviews?targetUserId=${userId}`, {
        headers: accessToken ? {
          'Authorization': `Bearer ${accessToken}`
        } : {}
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Требуется авторизация для загрузки отзывов');
          setError('Для просмотра отзывов необходимо авторизоваться');
        } else {
          throw new Error('Ошибка загрузки отзывов');
        }
      } else {
        const reviewsData = await response.json();
        console.log('Загружены отзывы:', reviewsData);
        
        setReviews(reviewsData);
        
        // Рассчитываем средний рейтинг
        if (reviewsData.length > 0) {
          const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0);
          setAverageRating((sum / reviewsData.length).toFixed(1));
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке отзывов:', error);
      setError('Не удалось загрузить отзывы. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Отправка нового отзыва
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null); // Очищаем предыдущие ошибки
    
    // Проверяем, что отзыв не пустой
    if (!newReview || newReview.trim() === '') {
      setError('Пожалуйста, введите текст отзыва');
      setSubmitting(false);
      return;
    }
    
    try {
      const accessToken = Cookies.get('twitch_access_token');
      if (!accessToken) {
        setError('Для отправки отзыва необходимо авторизоваться');
        return;
      }
      
      const reviewerId = currentUser?.id;
      if (!reviewerId) {
        setError('Не удалось определить ваш ID. Пожалуйста, авторизуйтесь заново.');
        return;
      }
      
      if (reviewerId === userId) {
        setError('Вы не можете оставить отзыв о себе');
        return;
      }
      
      // Проверяем, не оставлял ли пользователь уже отзыв
      const hasExistingReview = reviews.some(review => review.reviewerId === reviewerId);
      if (hasExistingReview) {
        setError('Вы уже оставили отзыв для этого пользователя');
        return;
      }
      
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          targetUserId: userId,
          reviewerId,
          rating,
          comment: newReview,
          categories: categories.filter(cat => cat.selected).map(cat => cat.id),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Ваша сессия истекла. Пожалуйста, авторизуйтесь заново.');
          // Можно добавить перенаправление на страницу авторизации
        } else {
          throw new Error(data.message || 'Ошибка при отправке отзыва');
        }
      } else {
        // Очищаем форму после успешной отправки
        setNewReview('');
        setRating(5);
        
        // Сбрасываем выбранные категории после отправки
        setCategories(categories.map(cat => ({ ...cat, selected: false })));
        
        // Устанавливаем сообщение об успехе и автоматически скрываем его через 5 секунд
        setSuccessMessage('Отзыв успешно добавлен!');
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
        
        // Добавляем новый отзыв в список без перезагрузки всех отзывов
        const newReviewData = {
          ...data.review,
          authorName: currentUser.display_name || currentUser.login,
          authorAvatar: currentUser.profile_image_url || '/default-avatar.png',
          createdAt: new Date().toISOString()
        };
        
        setReviews([newReviewData, ...reviews]);
        
        // Обновляем средний рейтинг
        const newTotal = reviews.reduce((sum, review) => sum + review.rating, 0) + rating;
        const newCount = reviews.length + 1;
        setAverageRating((newTotal / newCount).toFixed(1));
        
        // Перезагружаем отзывы для получения актуальных данных
        fetchReviews();
        
        // Вызываем колбэк, если он предоставлен
        if (typeof onReviewAdded === 'function') {
          onReviewAdded();
        }
      }
    } catch (error) {
      console.error('Ошибка при отправке отзыва:', error);
      setError(error.message || 'Произошла ошибка при отправке отзыва');
    } finally {
      setSubmitting(false);
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

  // Функция для переключения выбора категории
  const toggleCategory = (id) => {
    setCategories(prevCategories => 
      prevCategories.map(cat => 
        cat.id === id ? { ...cat, selected: !cat.selected } : cat
      )
    );
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
        <form className={styles.reviewForm} onSubmit={handleSubmit}>
          <div className={styles.ratingInput}>
            <label>Ваша оценка:</label>
            {renderStars(rating, true)}
          </div>
          
          <div className={styles.categoriesContainer}>
            <label>Выберите категории, которые подходят:</label>
            <div className={styles.categoriesList}>
              {categories.map(category => (
                <div 
                  key={category.id} 
                  className={`${styles.categoryTag} ${category.selected ? styles.categorySelected : ''}`}
                  onClick={() => toggleCategory(category.id)}
                >
                  {category.name}
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.textareaContainer}>
            <textarea
              className={styles.reviewTextarea}
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="Напишите ваш отзыв..."
              maxLength={500}
              required
            />
            <div className={styles.charCount}>
              {newReview.length}/500
            </div>
          </div>
          
          {error && <div className={styles.error}>{error}</div>}
          {successMessage && <div className={styles.success}>{successMessage}</div>}
          
          <button 
            type="submit" 
            className={styles.submitButton} 
            disabled={submitting || !newReview.trim()}
          >
            {submitting ? 'Отправка...' : 'Отправить отзыв'}
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

// Устанавливаем defaultProps для компонента
ReviewSection.defaultProps = {
  onReviewAdded: () => {} // Пустая функция по умолчанию
};

export default ReviewSection; 