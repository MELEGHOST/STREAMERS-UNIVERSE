import React, { useState } from 'react';
import styles from './MediaReview.module.css';

const MediaReview = ({ review, isStreamerReview = false, onSave, onDelete, editable = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(review?.rating || 0);
  const [comment, setComment] = useState(review?.comment || '');
  
  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Обработчик сохранения отзыва
  const handleSave = () => {
    if (onSave) {
      onSave({
        ...review,
        rating,
        comment
      });
    }
    setIsEditing(false);
  };
  
  // Обработчик удаления отзыва
  const handleDelete = () => {
    if (onDelete && window.confirm('Вы уверены, что хотите удалить этот отзыв?')) {
      onDelete(review.id);
    }
  };
  
  // Компонент для выбора рейтинга
  const RatingSelector = ({ value, onChange, disabled = false }) => {
    return (
      <div className={styles.ratingSelector}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
          <span
            key={star}
            className={`${styles.ratingStar} ${value >= star ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
            onClick={() => !disabled && onChange(star)}
          >
            {value >= star ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };
  
  // Если это новый отзыв (без данных)
  if (!review) {
    return (
      <div className={`${styles.reviewCard} ${styles.newReview}`}>
        <h3 className={styles.newReviewTitle}>Оставить отзыв</h3>
        <div className={styles.ratingContainer}>
          <span className={styles.ratingLabel}>Ваша оценка:</span>
          <RatingSelector value={rating} onChange={setRating} />
        </div>
        <textarea
          className={styles.commentInput}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Напишите ваш отзыв..."
          rows={4}
        />
        <div className={styles.reviewActions}>
          <button 
            className={styles.saveButton}
            onClick={handleSave}
            disabled={rating === 0}
          >
            Опубликовать
          </button>
        </div>
      </div>
    );
  }
  
  // Если это режим редактирования
  if (isEditing) {
    return (
      <div className={`${styles.reviewCard} ${isStreamerReview ? styles.streamerReview : ''}`}>
        <div className={styles.reviewHeader}>
          <div className={styles.reviewAuthor}>
            {isStreamerReview && <span className={styles.streamerBadge}>Стример</span>}
          </div>
        </div>
        <div className={styles.ratingContainer}>
          <span className={styles.ratingLabel}>Ваша оценка:</span>
          <RatingSelector value={rating} onChange={setRating} />
        </div>
        <textarea
          className={styles.commentInput}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Напишите ваш отзыв..."
          rows={4}
        />
        <div className={styles.reviewActions}>
          <button 
            className={styles.saveButton}
            onClick={handleSave}
          >
            Сохранить
          </button>
          <button 
            className={styles.cancelButton}
            onClick={() => {
              setRating(review.rating);
              setComment(review.comment);
              setIsEditing(false);
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }
  
  // Обычный режим просмотра
  return (
    <div className={`${styles.reviewCard} ${isStreamerReview ? styles.streamerReview : ''}`}>
      <div className={styles.reviewHeader}>
        <div className={styles.reviewAuthor}>
          {isStreamerReview && <span className={styles.streamerBadge}>Стример</span>}
          <span className={styles.reviewDate}>{formatDate(review.createdAt)}</span>
        </div>
        <div className={styles.reviewRating}>
          <RatingSelector value={review.rating} disabled={true} />
          <span className={styles.ratingValue}>{review.rating}/10</span>
        </div>
      </div>
      
      {review.comment && (
        <div className={styles.reviewComment}>
          {review.comment}
        </div>
      )}
      
      {editable && (
        <div className={styles.reviewActions}>
          <button 
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
          >
            Редактировать
          </button>
          <button 
            className={styles.deleteButton}
            onClick={handleDelete}
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaReview; 