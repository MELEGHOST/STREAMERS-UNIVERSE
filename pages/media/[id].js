import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from './media.module.css';
import MediaReview from '../../components/MediaReview';
import Cookies from 'js-cookie';

export default function MediaPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [streamerReview, setStreamerReview] = useState(null);
  const [viewerReviews, setViewerReviews] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);
  
  // Загрузка данных о медиа
  useEffect(() => {
    if (!id) return;
    
    const fetchMedia = async () => {
      try {
        setLoading(true);
        
        // Получаем данные о медиа
        const response = await fetch(`/api/media?id=${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch media');
        }
        
        const data = await response.json();
        setMedia(data);
        
        // Получаем ID пользователя из localStorage
        const userData = JSON.parse(localStorage.getItem('twitch_user') || '{}');
        setUserId(userData.id);
        setIsStreamer(userData.isStreamer || false);
        
        // Разделяем отзывы на отзыв стримера, отзыв текущего пользователя и отзывы зрителей
        if (data.reviews && Array.isArray(data.reviews)) {
          // Отзыв стримера
          const streamerReview = data.reviews.find(review => review.isStreamer);
          setStreamerReview(streamerReview);
          
          // Отзыв текущего пользователя
          const userReview = data.reviews.find(review => review.userId === userData.id);
          setUserReview(userReview);
          
          // Отзывы зрителей (кроме текущего пользователя)
          const otherViewerReviews = data.reviews.filter(
            review => !review.isStreamer && review.userId !== userData.id
          );
          setViewerReviews(otherViewerReviews);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching media:', error);
        setError('Не удалось загрузить информацию о медиа');
        setLoading(false);
      }
    };
    
    fetchMedia();
  }, [id]);
  
  // Обработчик сохранения отзыва
  const handleSaveReview = async (review) => {
    try {
      const accessToken = Cookies.get('twitch_access_token');
      
      if (!accessToken) {
        alert('Необходимо авторизоваться');
        return;
      }
      
      const isNewReview = !review.id;
      const method = isNewReview ? 'POST' : 'PUT';
      const url = isNewReview ? '/api/reviews' : '/api/reviews';
      
      const reviewData = isNewReview 
        ? { mediaId: id, rating: review.rating, comment: review.comment }
        : { id: review.id, rating: review.rating, comment: review.comment };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save review');
      }
      
      const savedReview = await response.json();
      
      // Обновляем список отзывов
      if (isNewReview) {
        if (savedReview.isStreamer) {
          setStreamerReview(savedReview);
        } else {
          setUserReview(savedReview);
        }
      } else {
        if (savedReview.isStreamer) {
          setStreamerReview(savedReview);
        } else {
          setUserReview(savedReview);
        }
      }
      
      // Перезагружаем данные о медиа для обновления рейтингов
      const mediaResponse = await fetch(`/api/media?id=${id}`);
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        setMedia(mediaData);
      }
      
      alert('Отзыв успешно сохранен');
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Не удалось сохранить отзыв');
    }
  };
  
  // Обработчик удаления отзыва
  const handleDeleteReview = async (reviewId) => {
    try {
      const response = await fetch(`/api/reviews?id=${reviewId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete review');
      }
      
      // Обновляем список отзывов
      if (userReview && userReview.id === reviewId) {
        setUserReview(null);
      } else if (streamerReview && streamerReview.id === reviewId) {
        setStreamerReview(null);
      }
      
      // Перезагружаем данные о медиа для обновления рейтингов
      const mediaResponse = await fetch(`/api/media?id=${id}`);
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        setMedia(mediaData);
      }
      
      alert('Отзыв успешно удален');
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Не удалось удалить отзыв');
    }
  };
  
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button 
          className={styles.backButton}
          onClick={() => router.back()}
        >
          Вернуться назад
        </button>
      </div>
    );
  }
  
  if (!media) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>Медиа не найдено</p>
        <button 
          className={styles.backButton}
          onClick={() => router.back()}
        >
          Вернуться назад
        </button>
      </div>
    );
  }
  
  return (
    <div className={styles.mediaPageContainer}>
      <div className={styles.mediaHeader}>
        <button 
          className={styles.backButton}
          onClick={() => router.back()}
        >
          ← Назад
        </button>
        <h1 className={styles.mediaTitle}>{media.title}</h1>
        <div className={styles.mediaCategory}>{media.category}</div>
      </div>
      
      <div className={styles.mediaContent}>
        <div className={styles.mediaImageContainer}>
          {media.imageUrl ? (
            <img 
              src={media.imageUrl} 
              alt={media.title} 
              className={styles.mediaImage}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"%3E%3Crect width="300" height="450" fill="%237B41C9"%3E%3C/rect%3E%3Ctext x="150" y="225" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3EНет изображения%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className={styles.noImage}>
              <span>Нет изображения</span>
            </div>
          )}
          
          <div className={styles.ratingsSummary}>
            <div className={styles.overallRating}>
              <div className={styles.ratingValue}>{media.ratings.overall.toFixed(1)}</div>
              <div className={styles.ratingLabel}>Общая оценка</div>
            </div>
            
            <div className={styles.detailedRatings}>
              <div className={styles.streamerRating}>
                <div className={styles.ratingValue}>{media.ratings.streamer.toFixed(1)}</div>
                <div className={styles.ratingLabel}>Оценка стримера</div>
                <div className={styles.ratingWeight}>60%</div>
              </div>
              
              <div className={styles.viewersRating}>
                <div className={styles.ratingValue}>{media.ratings.viewers.toFixed(1)}</div>
                <div className={styles.ratingLabel}>Оценка зрителей</div>
                <div className={styles.ratingWeight}>40%</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.mediaInfo}>
          {media.description && (
            <div className={styles.mediaDescription}>
              <h2 className={styles.sectionTitle}>Описание</h2>
              <p>{media.description}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.reviewsSection}>
        <h2 className={styles.sectionTitle}>Отзывы</h2>
        
        {/* Отзыв стримера */}
        {streamerReview && (
          <div className={styles.streamerReviewSection}>
            <h3 className={styles.subsectionTitle}>Отзыв стримера</h3>
            <MediaReview 
              review={streamerReview} 
              isStreamerReview={true}
              editable={isStreamer}
              onSave={handleSaveReview}
              onDelete={handleDeleteReview}
            />
          </div>
        )}
        
        {/* Форма для добавления отзыва стримера */}
        {isStreamer && !streamerReview && (
          <div className={styles.streamerReviewSection}>
            <h3 className={styles.subsectionTitle}>Ваш отзыв как стримера</h3>
            <MediaReview 
              onSave={handleSaveReview}
            />
          </div>
        )}
        
        {/* Отзыв текущего пользователя */}
        {!isStreamer && (
          <div className={styles.userReviewSection}>
            <h3 className={styles.subsectionTitle}>
              {userReview ? 'Ваш отзыв' : 'Оставить отзыв'}
            </h3>
            <MediaReview 
              review={userReview}
              editable={true}
              onSave={handleSaveReview}
              onDelete={handleDeleteReview}
            />
          </div>
        )}
        
        {/* Отзывы других зрителей */}
        {viewerReviews.length > 0 && (
          <div className={styles.viewerReviewsSection}>
            <h3 className={styles.subsectionTitle}>Отзывы зрителей ({viewerReviews.length})</h3>
            {viewerReviews.map(review => (
              <MediaReview 
                key={review.id}
                review={review}
              />
            ))}
          </div>
        )}
        
        {/* Если нет отзывов зрителей */}
        {viewerReviews.length === 0 && !userReview && !isStreamer && (
          <div className={styles.noReviews}>
            <p>Пока нет отзывов от зрителей. Будьте первым!</p>
          </div>
        )}
      </div>
    </div>
  );
} 