'use client';

import React, { useState, useEffect, useCallback } from 'react';
// import supabase from '@/lib/supabaseClient'; // Не используется
// import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa'; // Не используются
// import ReviewCard from './ReviewCard'; // Удаляем неиспользуемый импорт
// import ReviewForm from '../reviews/upload/UploadForm'; // Исправленный импорт
// import Pagination from './Pagination'; // Комментируем импорт Pagination
import styles from './ReviewSection.module.css';
import Cookies from 'js-cookie';
import { useAuth } from '../../contexts/AuthContext';

const ReviewSection = ({ streamerId, streamerLogin, isOwnProfile }) => {
  const { userId /* Удаляем , isAuthenticated */ } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Удаляем неиспользуемые состояния showForm, setShowForm
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(0); // 0 - нет оценки, 1-5 - оценка
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Удаляем неиспользуемые состояния submitError, setSubmitError
  // Удаляем неиспользуемые состояния userReview, setUserReview
  const [sortOrder] = useState('newest'); // 'newest', 'oldest', 'rating_high', 'rating_low'
  // Удаляем неиспользуемые состояния editingReview, setEditingReview
  // Удаляем неиспользуемые состояния showLoginPrompt, setShowLoginPrompt
  // const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 10 }); // Не используется
  // const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0 }); // Не используется

  // Получение данных текущего пользователя
  useEffect(() => {
    const userData = Cookies.get('twitch_user');
    if (userData) {
      try {
        // setCurrentUser(JSON.parse(userData));
      } catch (e) {
        console.error('Ошибка при парсинге данных пользователя:', e);
      }
    }
  }, []);

  // Загрузка отзывов
  const fetchReviews = useCallback(async (order = sortOrder) => {
    try {
      setIsLoading(true);
      
      // Определяем URL в зависимости от того, чьи отзывы мы загружаем
      const url = isOwnProfile 
        ? `/api/reviews?authorId=${streamerId}&page=${1}&limit=5&sort=${order}` 
        : `/api/reviews?targetId=${streamerId}&page=${1}&limit=5&sort=${order}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при загрузке отзывов: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Проверяем структуру ответа
      if (data.reviews) {
        // Если API возвращает объект с полем reviews
        setReviews(data.reviews);
        // Если API возвращает пагинацию
        if (data.pagination) {
          // setPagination(data.pagination);
        }
        // Если API возвращает статистику
        if (data.stats) {
          // setStats(data.stats);
        }
      } else if (Array.isArray(data)) {
        // Если API возвращает массив напрямую (для совместимости)
        setReviews(data);
        // Устанавливаем базовую пагинацию
        // setPagination({
        //   currentPage: 1,
        //   totalPages: Math.ceil((data && data.length) ? data.length / 5 : 1), // Безопасный расчет
        //   hasNextPage: false,
        //   hasPrevPage: false
        // });
      } else {
        console.warn('Неожиданный формат данных от API:', data);
        setReviews([]);
      }
    } catch (err) {
      console.error('Ошибка при загрузке отзывов:', err);
      setError('Не удалось загрузить отзывы. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  }, [streamerId, isOwnProfile, sortOrder]);

  // Загрузка отзывов при монтировании компонента
  useEffect(() => {
    if (streamerId) {
      fetchReviews();
    }
  }, [streamerId, fetchReviews]);

  // Обработчик отправки нового отзыва
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!newReviewText) {
      alert('Пожалуйста, заполните все поля');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const reviewData = {
        authorId: userId,
        content: newReviewText,
        rating: newRating,
        targetName: streamerLogin,
        targetType: 'streamer'
      };
      
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при отправке отзыва: ${response.status}`);
      }
      
      // Очищаем форму
      setNewReviewText('');
      setNewRating(0);
      
      // Получаем данные созданного отзыва
      const createdReview = await response.json();
      
      // Добавляем новый отзыв в начало списка
      setReviews(prevReviews => [createdReview, ...prevReviews]);
      
      // Перезагружаем отзывы для актуализации данных
      fetchReviews();
      
      alert('Отзыв успешно добавлен!');
    } catch (error) {
      console.error('Ошибка при отправке отзыва:', error);
      alert('Произошла ошибка при отправке отзыва. Пожалуйста, попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
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

  if (isLoading) {
    return <div className={styles.loading}>Загрузка отзывов...</div>;
  }
  
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.reviewsSection}>
      {isOwnProfile && (
        <div className={styles.addReviewForm}>
          <h3>Оставить новый отзыв</h3>
          <form onSubmit={handleSubmitReview}>
            <div className={styles.formGroup}>
              <label>Текст отзыва:</label>
              <textarea
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="Напишите ваш отзыв здесь..."
                rows={4}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Ваша оценка:</label>
              <div className={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`${styles.ratingButton} ${newRating === rating ? styles.selected : ''}`}
                    onClick={() => setNewRating(rating)}
                  >
                    {rating} ⭐
                  </button>
                ))}
              </div>
            </div>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
            </button>
          </form>
        </div>
      )}
      
      <div className={styles.reviewsList}>
        <h3>{isOwnProfile ? 'Ваши отзывы:' : 'Отзывы о пользователе:'}</h3>
        
        {reviews.length === 0 ? (
          <div className={styles.noReviews}>
            {isOwnProfile 
              ? 'Вы еще не оставили ни одного отзыва. Расскажите о своих впечатлениях!' 
              : 'У этого пользователя пока нет отзывов.'}
          </div>
        ) : (
          <div className={styles.reviewList}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewCardPlaceholder}> 
                <h4>{review.targetName || 'Отзыв'} - {review.rating}⭐</h4>
                <p>{review.content}</p>
                <small>От: {review.author?.username || 'Аноним'} | {formatDate(review.createdAt)}</small>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Пагинация (если будет использоваться) */}
      {/* {pagination && reviews && reviews.length > 0 && ( */}
      {/*   <Pagination pagination={pagination} onPageChange={handlePageChange} /> */}
      {/* )} */}
    </div>
  );
};

export default ReviewSection; 