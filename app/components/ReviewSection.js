'use client';

import React, { useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabaseClient';
import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa';
import ReviewCard from './ReviewCard';
// import ReviewForm from '../reviews/upload/UploadForm'; // Исправленный импорт
// import Pagination from './Pagination'; // Комментируем импорт Pagination
import styles from './ReviewSection.module.css';
import Cookies from 'js-cookie';

const ReviewSection = ({ userId, isAuthor = false, onReviewAdded }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [reviewTarget, setReviewTarget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [editingReview, setEditingReview] = useState(null);

  // Получение данных текущего пользователя
  useEffect(() => {
    const userData = Cookies.get('twitch_user');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (e) {
        console.error('Ошибка при парсинге данных пользователя:', e);
      }
    }
  }, []);

  // Загрузка отзывов
  const fetchReviews = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      
      // Определяем URL в зависимости от того, чьи отзывы мы загружаем
      const url = isAuthor 
        ? `/api/reviews?authorId=${userId}&page=${page}&limit=5` 
        : `/api/reviews?targetId=${userId}&page=${page}&limit=5`;
      
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
        if (data.pagination) {
          setPagination(data.pagination);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      } else if (Array.isArray(data)) {
        // Если API возвращает массив напрямую (для совместимости)
        setReviews(data);
        // Устанавливаем базовую пагинацию
        setPagination({
          currentPage: page,
          totalPages: Math.ceil(data.length / 5),
          hasNextPage: false,
          hasPrevPage: page > 1
        });
      } else {
        console.warn('Неожиданный формат данных от API:', data);
        setReviews([]);
      }
    } catch (err) {
      console.error('Ошибка при загрузке отзывов:', err);
      setError('Не удалось загрузить отзывы. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthor]);

  // Загрузка отзывов при монтировании компонента
  useEffect(() => {
    if (userId) {
      fetchReviews();
    }
  }, [userId, fetchReviews]);

  // Обработчик отправки нового отзыва
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!newReview || !reviewTarget) {
      alert('Пожалуйста, заполните все поля');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const reviewData = {
        authorId: userId,
        content: newReview,
        rating: newRating,
        targetName: reviewTarget,
        targetType: 'other'
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
      setNewReview('');
      setNewRating(5);
      setReviewTarget('');
      
      // Получаем данные созданного отзыва
      const createdReview = await response.json();
      
      // Добавляем новый отзыв в начало списка
      setReviews(prevReviews => [createdReview, ...prevReviews]);
      
      // Вызываем колбэк, если он передан
      if (onReviewAdded) {
        onReviewAdded();
      }
      
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

  // Обработчик отмены редактирования
  const handleCancelEdit = () => {
    setEditingReview(null);
    setNewReview('');
    setNewRating(0);
    setSelectedCategories([]);
  };

  // Обработчик выбора категории
  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Обработчик изменения страницы
  const handlePageChange = (page) => {
    fetchReviews(page);
  };

  // Проверка, оставил ли текущий пользователь отзыв
  const hasUserReviewed = reviews.some(review => 
    currentUser && review.authorId === currentUser.id
  );

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
    return <div className={styles.loading}>Загрузка отзывов...</div>;
  }
  
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.reviewsSection}>
      {isAuthor && (
        <div className={styles.addReviewForm}>
          <h3>Оставить новый отзыв</h3>
          <form onSubmit={handleSubmitReview}>
            <div className={styles.formGroup}>
              <label>О чём или о ком ваш отзыв:</label>
              <input
                type="text"
                value={reviewTarget}
                onChange={(e) => setReviewTarget(e.target.value)}
                placeholder="Например: Игра, фильм, сервис, продукт..."
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
            <div className={styles.formGroup}>
              <label>Текст отзыва:</label>
              <textarea
                value={newReview}
                onChange={(e) => setNewReview(e.target.value)}
                placeholder="Напишите ваш отзыв здесь..."
                rows={4}
                required
              />
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
        <h3>{isAuthor ? 'Ваши отзывы:' : 'Отзывы о пользователе:'}</h3>
        
        {reviews.length === 0 ? (
          <div className={styles.noReviews}>
            {isAuthor 
              ? 'Вы еще не оставили ни одного отзыва. Расскажите о своих впечатлениях!' 
              : 'У этого пользователя пока нет отзывов.'}
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewTarget}>
                  <span className={styles.targetName}>{review.targetName}</span>
                  <div className={styles.reviewRating}>
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <span key={i} className={styles.star}>⭐</span>
                    ))}
                  </div>
                </div>
                <div className={styles.reviewDate}>
                  {formatDate(review.createdAt)}
                </div>
              </div>
              <div className={styles.reviewContent}>
                {review.content}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Комментируем использование Pagination */}
      {/* 
      {reviews.length > 0 && pagination && (
        <Pagination 
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange} 
        />
      )}
      */}
    </div>
  );
};

export default ReviewSection; 