'use client';

import React, { useState } from 'react';
import { FaThumbsUp, FaThumbsDown, FaUserCircle } from 'react-icons/fa';
import Image from 'next/image';
import styles from './ReviewCard.module.css';

const ReviewCard = ({ review }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [likes, setLikes] = useState(review?.likes || 0);
  const [dislikes, setDislikes] = useState(review?.dislikes || 0);
  const [userAction, setUserAction] = useState(null); // 'like', 'dislike', null
  const [isLoadingVote, setIsLoadingVote] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Если отзыва нет, отображаем заглушку
  if (!review || !review.id) {
    return (
      <div className={styles.reviewCardPlaceholder}>
        <div className={styles.shimmerEffect}></div>
      </div>
    );
  }
  
  // Формирование даты в читаемом формате
  const formatDate = (dateString) => {
    if (!dateString) return '';
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
    const numRating = Number(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      if (i <= numRating) {
        stars.push(<span key={i} className={styles.starFilled}>★</span>);
      } else {
        stars.push(<span key={i} className={styles.starEmpty}>☆</span>);
      }
    }
    return stars;
  };
  
  // Обработка голоса через API
  const handleVote = async (actionType) => {
    if (isLoadingVote) return;
    setIsLoadingVote(true);
    setErrorMessage('');

    let voteToSend;
    if (userAction === actionType) {
      voteToSend = 0;
    } else {
      voteToSend = actionType;
    }

    try {
      const response = await fetch(`/api/reviews/${review.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voteType: voteToSend }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при голосовании');
      }

      if (data.success) {
        setLikes(data.likes);
        setDislikes(data.dislikes);
        setUserAction(data.currentUserVote);
      } else {
        setErrorMessage(data.message || 'Не удалось обработать голос');
      }

    } catch (error) {
      console.error('Ошибка при голосовании:', error);
      setErrorMessage(error.message);
    } finally {
      setIsLoadingVote(false);
    }
  };
  
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <div className={styles.reviewUser}>
          <Image 
            src={review.userAvatar || 'https://via.placeholder.com/40'} 
            alt={review.userName || 'User'}
            className={styles.userAvatar} 
            width={40}
            height={40}
          />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{review.userName || 'Аноним'}</div>
            <div className={styles.reviewDate}>{formatDate(review.created_at || review.date)}</div>
          </div>
        </div>
        <div className={styles.reviewRating}>
          {renderStars(review.rating)}
          <span className={styles.ratingValue}>{review.rating ?? '-'}/5</span>
        </div>
      </div>
      
      <div className={styles.reviewContent}>
        <h3 className={styles.reviewTitle}>{review.title || review.productName || 'Отзыв'}</h3>
        
        {review.productName && (
          <div className={styles.reviewProduct}>
            <Image 
              src={review.productImage || 'https://via.placeholder.com/60'} 
              alt={review.productName} 
              className={styles.productImage} 
              width={60}
              height={60}
            />
            <div className={styles.productInfo}>
              <div className={styles.productName}>{review.productName}</div>
              {review.productPrice && <div className={styles.productPrice}>{review.productPrice}</div>}
            </div>
          </div>
        )}
        
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
        
        {(review.pros?.length > 0 || review.cons?.length > 0) && (
          <div className={styles.prosConsContainer}>
            {review.pros?.length > 0 && (
              <div className={styles.prosContainer}>
                <div className={styles.prosTitle}>
                  <span className={styles.prosIcon}>👍</span> Плюсы
                </div>
                <ul className={styles.prosList}>
                  {review.pros.map((pro, index) => (
                    <li key={index} className={styles.prosItem}>{pro}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {review.cons?.length > 0 && (
              <div className={styles.consContainer}>
                <div className={styles.consTitle}>
                  <span className={styles.consIcon}>👎</span> Минусы
                </div>
                <ul className={styles.consList}>
                  {review.cons.map((con, index) => (
                    <li key={index} className={styles.consItem}>{con}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={styles.reviewFooter}>
        {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}
        
        <div className={styles.voteButtons}>
          <button
            className={`${styles.likeButton} ${userAction === 1 ? styles.active : ''} ${isLoadingVote ? styles.loading : ''}`}
            onClick={() => handleVote(1)}
            disabled={isLoadingVote}
          >
            <span className={styles.likeIcon}>👍</span>
            <span className={styles.likeCount}>{likes}</span>
          </button>
          
          <button
            className={`${styles.dislikeButton} ${userAction === -1 ? styles.active : ''} ${isLoadingVote ? styles.loading : ''}`}
            onClick={() => handleVote(-1)}
            disabled={isLoadingVote}
          >
            <span className={styles.dislikeIcon}>👎</span>
            <span className={styles.dislikeCount}>{dislikes}</span>
          </button>
        </div>
        
        {review.tags?.length > 0 && (
          <div className={styles.reviewTags}>
            {review.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard; 