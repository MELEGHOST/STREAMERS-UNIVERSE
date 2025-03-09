'use client';

import React from 'react';
import ReviewCard from './ReviewCard';
import styles from './ReviewList.module.css';

const ReviewList = ({ reviews, filter }) => {
  // Фильтрация отзывов
  const getFilteredReviews = () => {
    if (!reviews || reviews.length === 0) return [];
    
    switch (filter) {
      case 'recent':
        return [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
      case 'popular':
        return [...reviews].sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
      case 'highest':
        return [...reviews].sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return [...reviews].sort((a, b) => a.rating - b.rating);
      default:
        return reviews;
    }
  };
  
  const filteredReviews = getFilteredReviews();
  
  return (
    <div className={styles.reviewListContainer}>
      {filteredReviews.length > 0 ? (
        <div className={styles.reviewGrid}>
          {filteredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className={styles.noReviewsMessage}>
          <p>По вашему запросу отзывов не найдено</p>
        </div>
      )}
    </div>
  );
};

export default ReviewList; 