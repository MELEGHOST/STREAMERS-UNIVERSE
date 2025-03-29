import React from 'react';
import styles from './MediaCard.module.css';
import { useRouter } from 'next/router';
import Image from 'next/image';

const MediaCard = ({ media, showRating = true, onClick }) => {
  const router = useRouter();
  
  // Функция для отображения рейтинга в виде звезд
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <div className={styles.stars}>
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className={styles.star}>★</span>
        ))}
        {halfStar && <span className={styles.star}>⯨</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className={styles.emptyStar}>☆</span>
        ))}
      </div>
    );
  };
  
  // Обработчик клика по карточке
  const handleClick = () => {
    if (onClick) {
      onClick(media);
    } else {
      router.push(`/media/${media.id}`);
    }
  };
  
  return (
    <div className={styles.mediaCard} onClick={handleClick}>
      <div className={styles.imageContainer}>
        {media.imageUrl ? (
          <Image
            src={media.imageUrl} 
            alt={media.title} 
            className={styles.image}
            layout="fill"
            objectFit="cover"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"%3E%3Crect width="200" height="300" fill="%237B41C9"%3E%3C/rect%3E%3Ctext x="100" y="150" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3EНет изображения%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className={styles.noImage}>
            <span>Нет изображения</span>
          </div>
        )}
        
        {showRating && media.ratings && (
          <div className={styles.ratingBadge}>
            <div className={styles.overallRating}>
              {media.ratings.overall.toFixed(1)}
            </div>
            <div className={styles.ratingDetails}>
              <div className={styles.streamerRating}>
                <span className={styles.ratingLabel}>Стример:</span>
                <span className={styles.ratingValue}>{media.ratings.streamer.toFixed(1)}</span>
              </div>
              <div className={styles.viewersRating}>
                <span className={styles.ratingLabel}>Зрители:</span>
                <span className={styles.ratingValue}>{media.ratings.viewers.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>{media.title}</h3>
        <div className={styles.category}>{media.category}</div>
        
        {showRating && media.ratings && (
          <div className={styles.ratingStars}>
            {renderStars(media.ratings.overall)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCard; 