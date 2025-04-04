import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from './media.module.css';
import Cookies from 'js-cookie';
import Image from 'next/image';

export default function AddMediaPage() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);
  
  // Проверяем, является ли пользователь стримером
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      setIsStreamer(userData.isStreamer || false);
      
      if (!userData.isStreamer) {
        setError('Только стримеры могут добавлять медиа');
      }
    } catch (e) {
      console.error('Error checking streamer status:', e);
      setError('Ошибка при проверке статуса стримера');
    }
  }, []);
  
  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !category) {
      setError('Название и категория обязательны для заполнения');
      return;
    }
    
    try {
      setLoading(true);
      
      const accessToken = Cookies.get('twitch_access_token');
      
      if (!accessToken) {
        setError('Необходимо авторизоваться');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          category,
          description,
          imageUrl: imageUrl || null,
          rating: rating > 0 ? rating : null,
          comment: comment || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при добавлении медиа');
      }
      
      const data = await response.json();
      
      // Перенаправляем на страницу медиа
      router.push(`/media/${data.id}`);
    } catch (error) {
      console.error('Error adding media:', error);
      setError(error.message || 'Произошла ошибка при добавлении медиа');
      setLoading(false);
    }
  };
  
  // Компонент для выбора рейтинга
  const RatingSelector = () => {
    return (
      <div className={styles.ratingSelector}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
          <span
            key={star}
            className={`${styles.ratingStar} ${rating >= star ? styles.active : ''}`}
            onClick={() => setRating(star)}
          >
            {rating >= star ? '★' : '☆'}
          </span>
        ))}
        {rating > 0 && (
          <span className={styles.ratingValue}>{rating}/10</span>
        )}
      </div>
    );
  };
  
  if (error && !isStreamer) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button 
          className={styles.backButton}
          onClick={() => router.push('/profile')}
        >
          Вернуться в профиль
        </button>
      </div>
    );
  }
  
  if (!isStreamer) {
    return <p>Только стримеры могут добавлять медиа.</p>;
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
        <h1 className={styles.mediaTitle}>Добавить медиа</h1>
      </div>
      
      <form className={styles.mediaForm} onSubmit={handleSubmit}>
        {error && (
          <div className={styles.formError}>
            {error}
          </div>
        )}
        
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.formLabel}>Название *</label>
          <input
            type="text"
            id="title"
            className={styles.formInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Введите название"
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="category" className={styles.formLabel}>Категория *</label>
          <select
            id="category"
            className={styles.formSelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Выберите категорию</option>
            <option value="Фильм">Фильм</option>
            <option value="Сериал">Сериал</option>
            <option value="Игра">Игра</option>
            <option value="Книга">Книга</option>
            <option value="Музыка">Музыка</option>
            <option value="Другое">Другое</option>
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.formLabel}>Описание</label>
          <textarea
            id="description"
            className={styles.formTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Введите описание"
            rows={4}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="imageUrl" className={styles.formLabel}>URL изображения</label>
          <input
            type="url"
            id="imageUrl"
            className={styles.formInput}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          
          {imageUrl && (
            <div className={styles.imagePreview}>
              <Image
                src={imageUrl} 
                alt="Предпросмотр" 
                width={200}
                height={200}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%237B41C9"%3E%3C/rect%3E%3Ctext x="100" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3EНеверный URL%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Ваша оценка</label>
          <RatingSelector />
        </div>
        
        {rating > 0 && (
          <div className={styles.formGroup}>
            <label htmlFor="comment" className={styles.formLabel}>Комментарий к оценке</label>
            <textarea
              id="comment"
              className={styles.formTextarea}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Напишите ваш отзыв"
              rows={4}
            />
          </div>
        )}
        
        <div className={styles.formActions}>
          <button 
            type="button" 
            className={styles.cancelButton}
            onClick={() => router.back()}
          >
            Отмена
          </button>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading || !title || !category}
          >
            {loading ? 'Добавление...' : 'Добавить медиа'}
          </button>
        </div>
      </form>
    </div>
  );
} 