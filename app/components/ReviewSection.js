'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './ReviewSection.module.css';
import Cookies from 'js-cookie';
import { FaStar } from 'react-icons/fa';
import { FaEdit, FaTrash } from 'react-icons/fa';

const ReviewSection = ({ streamerId, onReviewAdded }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categories, setCategories] = useState([
    'Юмор', 'Игровой скилл', 'Общение со зрителями', 'Регулярность стримов', 
    'Разнообразие контента', 'Атмосфера', 'Технические аспекты', 'Оригинальность'
  ]);
  const [successMessage, setSuccessMessage] = useState('');
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
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
      const token = Cookies.get('twitch_token');
      
      const response = await fetch(`/api/reviews?streamerId=${streamerId}&page=${page}&limit=5`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при загрузке отзывов');
      }
      
      const data = await response.json();
      setReviews(data.reviews);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Ошибка при загрузке отзывов:', err);
      setError('Не удалось загрузить отзывы. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [streamerId]);

  // Загрузка отзывов при монтировании компонента
  useEffect(() => {
    if (streamerId) {
      fetchReviews();
    }
  }, [streamerId, fetchReviews]);

  // Обработчик отправки нового отзыва
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Необходимо авторизоваться для отправки отзыва');
      return;
    }
    
    if (!newReview.trim()) {
      setError('Текст отзыва не может быть пустым');
      return;
    }
    
    if (rating === 0) {
      setError('Пожалуйста, выберите рейтинг');
      return;
    }
    
    try {
      setLoading(true);
      const token = Cookies.get('twitch_token');
      
      if (!token) {
        setError('Необходимо авторизоваться для отправки отзыва');
        return;
      }
      
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newReview,
          rating,
          streamerId,
          categories: selectedCategories
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при отправке отзыва');
      }
      
      const data = await response.json();
      
      // Очищаем форму
      setNewReview('');
      setRating(0);
      setSelectedCategories([]);
      setSuccessMessage(`Отзыв успешно добавлен! Вы получили ${data.coinsEarned} StreamCoins.`);
      
      // Обновляем список отзывов
      fetchReviews();
      
      // Вызываем колбэк, если он предоставлен
      if (onReviewAdded) {
        onReviewAdded(data.review);
      }
      
      // Скрываем сообщение об успехе через 5 секунд
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Ошибка при отправке отзыва:', err);
      setError(err.message || 'Не удалось отправить отзыв. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик удаления отзыва
  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) {
      return;
    }
    
    try {
      setLoading(true);
      const token = Cookies.get('twitch_token');
      
      if (!token) {
        setError('Необходимо авторизоваться для удаления отзыва');
        return;
      }
      
      const response = await fetch(`/api/reviews/delete/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при удалении отзыва');
      }
      
      const data = await response.json();
      
      setSuccessMessage(`Отзыв успешно удален. Списано ${data.coinsSpent} StreamCoins.`);
      
      // Обновляем список отзывов
      fetchReviews();
      
      // Скрываем сообщение об успехе через 5 секунд
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Ошибка при удалении отзыва:', err);
      setError(err.message || 'Не удалось удалить отзыв. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик редактирования отзыва
  const handleEditReview = (review) => {
    setEditingReview(review);
    setNewReview(review.content);
    setRating(review.rating);
    setSelectedCategories(review.categories || []);
  };

  // Обработчик сохранения отредактированного отзыва
  const handleUpdateReview = async (e) => {
    e.preventDefault();
    
    if (!editingReview) {
      return;
    }
    
    if (!newReview.trim()) {
      setError('Текст отзыва не может быть пустым');
      return;
    }
    
    if (rating === 0) {
      setError('Пожалуйста, выберите рейтинг');
      return;
    }
    
    try {
      setLoading(true);
      const token = Cookies.get('twitch_token');
      
      if (!token) {
        setError('Необходимо авторизоваться для редактирования отзыва');
        return;
      }
      
      const response = await fetch(`/api/reviews/update/${editingReview.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newReview,
          rating,
          categories: selectedCategories
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при обновлении отзыва');
      }
      
      // Очищаем форму
      setNewReview('');
      setRating(0);
      setSelectedCategories([]);
      setEditingReview(null);
      setSuccessMessage('Отзыв успешно обновлен!');
      
      // Обновляем список отзывов
      fetchReviews();
      
      // Скрываем сообщение об успехе через 5 секунд
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Ошибка при обновлении отзыва:', err);
      setError(err.message || 'Не удалось обновить отзыв. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик отмены редактирования
  const handleCancelEdit = () => {
    setEditingReview(null);
    setNewReview('');
    setRating(0);
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

  return (
    <div className={styles.reviewSection}>
      <h2 className={styles.sectionTitle}>Отзывы</h2>
      
      {stats && (
        <div className={styles.statsContainer}>
          <div className={styles.averageRating}>
            <span className={styles.ratingValue}>{stats.averageRating.toFixed(1)}</span>
            <div className={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={styles.statsStar}
                  color={star <= Math.round(stats.averageRating) ? '#ffc107' : '#e4e5e9'}
                />
              ))}
            </div>
            <span className={styles.totalReviews}>Всего отзывов: {stats.totalReviews}</span>
          </div>
          
          <div className={styles.ratingDistribution}>
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className={styles.ratingBar}>
                <span className={styles.ratingLabel}>{star}</span>
                <div className={styles.barContainer}>
                  <div 
                    className={styles.barFill} 
                    style={{ 
                      width: stats.totalReviews > 0 
                        ? `${(stats.ratingDistribution[star] / stats.totalReviews) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
                <span className={styles.ratingCount}>{stats.ratingDistribution[star]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button 
            className={styles.closeButton} 
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
          <button 
            className={styles.closeButton} 
            onClick={() => setSuccessMessage('')}
          >
            &times;
          </button>
        </div>
      )}
      
      {currentUser && !hasUserReviewed && !editingReview && (
        <form 
          className={styles.reviewForm} 
          onSubmit={handleSubmit}
        >
          <h3 className={styles.formTitle}>Оставить отзыв</h3>
          
          <div className={styles.ratingContainer}>
            <span className={styles.ratingLabel}>Рейтинг:</span>
            <div className={styles.stars}>
              {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                  <label key={index}>
                    <input
                      type="radio"
                      name="rating"
                      value={ratingValue}
                      onClick={() => setRating(ratingValue)}
                      className={styles.starInput}
                    />
                    <FaStar
                      className={styles.star}
                      color={ratingValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'}
                      size={24}
                      onMouseEnter={() => setHover(ratingValue)}
                      onMouseLeave={() => setHover(0)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
          
          <div className={styles.categoriesContainer}>
            <span className={styles.categoriesLabel}>Категории:</span>
            <div className={styles.categoriesList}>
              {categories.map((category) => (
                <label key={category} className={styles.categoryLabel}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className={styles.categoryCheckbox}
                  />
                  <span className={styles.categoryName}>{category}</span>
                </label>
              ))}
            </div>
          </div>
          
          <textarea
            className={styles.reviewInput}
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            placeholder="Напишите ваш отзыв..."
            rows={4}
            required
          />
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Отправка...' : 'Отправить отзыв'}
          </button>
        </form>
      )}
      
      {currentUser && editingReview && (
        <form 
          className={styles.reviewForm} 
          onSubmit={handleUpdateReview}
        >
          <h3 className={styles.formTitle}>Редактировать отзыв</h3>
          
          <div className={styles.ratingContainer}>
            <span className={styles.ratingLabel}>Рейтинг:</span>
            <div className={styles.stars}>
              {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                  <label key={index}>
                    <input
                      type="radio"
                      name="rating"
                      value={ratingValue}
                      onClick={() => setRating(ratingValue)}
                      className={styles.starInput}
                    />
                    <FaStar
                      className={styles.star}
                      color={ratingValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'}
                      size={24}
                      onMouseEnter={() => setHover(ratingValue)}
                      onMouseLeave={() => setHover(0)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
          
          <div className={styles.categoriesContainer}>
            <span className={styles.categoriesLabel}>Категории:</span>
            <div className={styles.categoriesList}>
              {categories.map((category) => (
                <label key={category} className={styles.categoryLabel}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className={styles.categoryCheckbox}
                  />
                  <span className={styles.categoryName}>{category}</span>
                </label>
              ))}
            </div>
          </div>
          
          <textarea
            className={styles.reviewInput}
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            placeholder="Напишите ваш отзыв..."
            rows={4}
            required
          />
          
          <div className={styles.editButtons}>
            <button 
              type="button" 
              className={styles.cancelButton}
              onClick={handleCancelEdit}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      )}
      
      {reviews.length > 0 ? (
        <div className={styles.reviewsList}>
          {reviews.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewAuthor}>
                  <img 
                    src={review.author.avatar || '/images/default-avatar.png'} 
                    alt={review.author.displayName || review.author.username} 
                    className={styles.authorAvatar}
                  />
                  <span className={styles.authorName}>
                    {review.author.displayName || review.author.username}
                  </span>
                </div>
                <div className={styles.reviewRating}>
                  {[...Array(5)].map((_, index) => (
                    <FaStar
                      key={index}
                      className={styles.ratingStar}
                      color={index < review.rating ? '#ffc107' : '#e4e5e9'}
                    />
                  ))}
                </div>
              </div>
              
              {review.categories && review.categories.length > 0 && (
                <div className={styles.reviewCategories}>
                  {review.categories.map((category) => (
                    <span key={category} className={styles.categoryTag}>
                      {category}
                    </span>
                  ))}
                </div>
              )}
              
              <div className={styles.reviewContent}>
                {review.content}
              </div>
              
              <div className={styles.reviewFooter}>
                <span className={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                </span>
                
                {currentUser && currentUser.id === review.authorId && (
                  <div className={styles.reviewActions}>
                    <button 
                      className={styles.editButton}
                      onClick={() => handleEditReview(review)}
                      title="Редактировать"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteReview(review.id)}
                      title="Удалить"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button 
                className={styles.pageButton}
                disabled={!pagination.hasPrevPage}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
              >
                &laquo; Назад
              </button>
              
              <span className={styles.pageInfo}>
                Страница {pagination.currentPage} из {pagination.totalPages}
              </span>
              
              <button 
                className={styles.pageButton}
                disabled={!pagination.hasNextPage}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
              >
                Вперед &raquo;
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.noReviews}>
          {loading ? 'Загрузка отзывов...' : 'Отзывов пока нет. Будьте первым, кто оставит отзыв!'}
        </div>
      )}
    </div>
  );
};

export default ReviewSection; 