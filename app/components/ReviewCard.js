'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './ReviewCard.module.css';

const ReviewCard = ({ 
  review = {}, 
  onLike = () => {}, 
  onDislike = () => {} 
}) => {
  const [liked, setLiked] = useState(review.userLiked || false);
  const [disliked, setDisliked] = useState(review.userDisliked || false);
  const [likesCount, setLikesCount] = useState(review.likes || 0);
  const [dislikesCount, setDislikesCount] = useState(review.dislikes || 0);

  const handleLike = () => {
    if (liked) {
      // Отменяем лайк
      setLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
      onLike(review.id, false);
    } else {
      // Ставим лайк
      setLiked(true);
      setLikesCount(prev => prev + 1);
      
      // Если был дизлайк, убираем его
      if (disliked) {
        setDisliked(false);
        setDislikesCount(prev => Math.max(0, prev - 1));
      }
      
      onLike(review.id, true);
    }
  };

  const handleDislike = () => {
    if (disliked) {
      // Отменяем дизлайк
      setDisliked(false);
      setDislikesCount(prev => Math.max(0, prev - 1));
      onDislike(review.id, false);
    } else {
      // Ставим дизлайк
      setDisliked(true);
      setDislikesCount(prev => prev + 1);
      
      // Если был лайк, убираем его
      if (liked) {
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      }
      
      onDislike(review.id, true);
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }).format(date);
  };

  // Получаем рейтинг в звездах
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <span key={i} className={styles.star}>★</span>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <span key={i} className={styles.halfStar}>★</span>
        );
      } else {
        stars.push(
          <span key={i} className={styles.emptyStar}>☆</span>
        );
      }
    }
    
    return stars;
  };

  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <div className={styles.categoryTag}>
          {review.category || 'Категория'}
        </div>
        <div className={styles.rating}>
          {renderStars(review.rating || 0)}
        </div>
      </div>
      
      <div className={styles.reviewContent}>
        <h3 className={styles.reviewTitle}>{review.title || 'Название отзыва'}</h3>
        <div className={styles.productInfo}>
          <div className={styles.productImage}>
            {review.productImage ? (
              <Image 
                src={review.productImage} 
                alt={review.productName || 'Товар'} 
                width={80} 
                height={80} 
                objectFit="cover"
              />
            ) : (
              <div className={styles.noImage}>Нет фото</div>
            )}
          </div>
          <div className={styles.productDetails}>
            <h4 className={styles.productName}>{review.productName || 'Название товара'}</h4>
            <div className={styles.productMeta}>
              {review.productBrand && <span className={styles.brand}>{review.productBrand}</span>}
              {review.productPrice && <span className={styles.price}>{review.productPrice} ₽</span>}
            </div>
          </div>
        </div>
        
        <p className={styles.reviewText}>{review.text || 'Текст отзыва отсутствует'}</p>
        
        {review.pros && review.pros.length > 0 && (
          <div className={styles.prosSection}>
            <h5>Достоинства:</h5>
            <ul>
              {review.pros.map((pro, index) => (
                <li key={index}>{pro}</li>
              ))}
            </ul>
          </div>
        )}
        
        {review.cons && review.cons.length > 0 && (
          <div className={styles.consSection}>
            <h5>Недостатки:</h5>
            <ul>
              {review.cons.map((con, index) => (
                <li key={index}>{con}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className={styles.reviewFooter}>
        <div className={styles.reviewDate}>
          {formatDate(review.date)}
        </div>
        
        <div className={styles.reviewActions}>
          <button 
            className={`${styles.actionButton} ${liked ? styles.liked : ''}`}
            onClick={handleLike}
          >
            <span className={styles.actionIcon}>👍</span>
            <span className={styles.actionCount}>{likesCount}</span>
          </button>
          
          <button 
            className={`${styles.actionButton} ${disliked ? styles.disliked : ''}`}
            onClick={handleDislike}
          >
            <span className={styles.actionIcon}>👎</span>
            <span className={styles.actionCount}>{dislikesCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewCard; 