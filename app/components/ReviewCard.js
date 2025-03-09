'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './ReviewCard.module.css';

const ReviewCard = ({ review }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [likes, setLikes] = useState(review?.likes || 0);
  const [dislikes, setDislikes] = useState(review?.dislikes || 0);
  const [userAction, setUserAction] = useState(null); // 'like', 'dislike', null
  
  // Если отзыва нет, отображаем заглушку
  if (!review) {
    return (
      <div className={styles.reviewCardPlaceholder}>
        <div className={styles.shimmerEffect}></div>
      </div>
    );
  }
  
  // Формирование даты в читаемом формате
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Генерация звезд для отображения рейтинга
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<span key={i} className={styles.starFilled}>★</span>);
      } else {
        stars.push(<span key={i} className={styles.starEmpty}>☆</span>);
      }
    }
    return stars;
  };
  
  // Обработка лайка/дизлайка
  const handleVote = (action) => {
    if (userAction === action) {
      // Отмена голоса
      if (action === 'like') {
        setLikes(likes - 1);
      } else {
        setDislikes(dislikes - 1);
      }
      setUserAction(null);
    } else {
      // Новый голос или смена голоса
      if (userAction === 'like' && action === 'dislike') {
        setLikes(likes - 1);
        setDislikes(dislikes + 1);
      } else if (userAction === 'dislike' && action === 'like') {
        setLikes(likes + 1);
        setDislikes(dislikes - 1);
      } else if (action === 'like') {
        setLikes(likes + 1);
      } else {
        setDislikes(dislikes + 1);
      }
      setUserAction(action);
    }
  };
  
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <div className={styles.reviewUser}>
          <img 
            src={review.userAvatar || 'https://via.placeholder.com/40'} 
            alt={review.userName} 
            className={styles.userAvatar} 
          />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{review.userName}</div>
            <div className={styles.reviewDate}>{formatDate(review.date || new Date())}</div>
          </div>
        </div>
        <div className={styles.reviewRating}>
          {renderStars(review.rating)}
          <span className={styles.ratingValue}>{review.rating}/5</span>
        </div>
      </div>
      
      <div className={styles.reviewContent}>
        <h3 className={styles.reviewTitle}>{review.title}</h3>
        
        <div className={styles.reviewProduct}>
          <img 
            src={review.productImage || 'https://via.placeholder.com/60'} 
            alt={review.productName} 
            className={styles.productImage} 
          />
          <div className={styles.productInfo}>
            <div className={styles.productName}>{review.productName}</div>
            <div className={styles.productPrice}>{review.productPrice}</div>
          </div>
        </div>
        
        <div className={`${styles.reviewText} ${isExpanded ? styles.expanded : ''}`}>
          {review.text}
        </div>
        
        {review.text && review.text.length > 200 && !isExpanded && (
          <button 
            className={styles.readMoreButton}
            onClick={() => setIsExpanded(true)}
          >
            Читать далее
          </button>
        )}
        
        {isExpanded && (
          <button 
            className={styles.collapseButton}
            onClick={() => setIsExpanded(false)}
          >
            Свернуть
          </button>
        )}
        
        <div className={styles.prosConsContainer}>
          <div className={styles.prosContainer}>
            <div className={styles.prosTitle}>
              <span className={styles.prosIcon}>👍</span> Плюсы
            </div>
            <ul className={styles.prosList}>
              {review.pros && review.pros.map((pro, index) => (
                <li key={index} className={styles.prosItem}>{pro}</li>
              ))}
            </ul>
          </div>
          
          <div className={styles.consContainer}>
            <div className={styles.consTitle}>
              <span className={styles.consIcon}>👎</span> Минусы
            </div>
            <ul className={styles.consList}>
              {review.cons && review.cons.map((con, index) => (
                <li key={index} className={styles.consItem}>{con}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className={styles.reviewFooter}>
        <div className={styles.voteButtons}>
          <button 
            className={`${styles.likeButton} ${userAction === 'like' ? styles.active : ''}`}
            onClick={() => handleVote('like')}
          >
            <span className={styles.likeIcon}>👍</span>
            <span className={styles.likeCount}>{likes}</span>
          </button>
          
          <button 
            className={`${styles.dislikeButton} ${userAction === 'dislike' ? styles.active : ''}`}
            onClick={() => handleVote('dislike')}
          >
            <span className={styles.dislikeIcon}>👎</span>
            <span className={styles.dislikeCount}>{dislikes}</span>
          </button>
        </div>
        
        <div className={styles.reviewTags}>
          {review.tags && review.tags.map((tag, index) => (
            <span key={index} className={styles.tag}>#{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewCard; 