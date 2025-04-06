'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './reviews.module.css'; 
import pageStyles from '../../styles/page.module.css';
import Image from 'next/image';

// Компонент для отображения одного отзыва (можно вынести в отдельный файл)
function ReviewCard({ review }) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Неизвестно';
        try {
            return new Date(dateString).toLocaleDateString('ru-RU', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch { return 'Неверная дата'; }
    };

    return (
        <div className={`${styles.reviewCard} ${styles[review.status] || ''}`}>
            <div className={styles.reviewHeader}>
                <span className={styles.reviewItemName}>{review.item_name}</span>
                <span className={styles.reviewCategory}>
                    {review.category}{review.subcategory ? ` / ${review.subcategory}` : ''}
                </span>
                {typeof review.rating === 'number' && (
                    <span className={styles.reviewRating}>Рейтинг: {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                )}
            </div>
            {review.image_url && (
                <div className={styles.reviewImageContainer}>
                    <Image 
                        src={review.image_url} 
                        alt={`Изображение к отзыву на ${review.item_name}`}
                        width={400}
                        height={300}
                        className={styles.reviewImage} 
                        style={{ objectFit: 'cover' }}
                    />
                </div>
            )}
            {review.text_content && <p className={styles.reviewText}>{review.text_content}</p>}
            {review.generated_content && (
                <div className={styles.generatedContent}>
                    <h4>AI Сгенерированный отзыв:</h4>
                    <p>{review.generated_content}</p>
                    {review.source_file_url && 
                        <small>Источник: <a href={review.source_file_url} target="_blank" rel="noopener noreferrer">Файл</a></small>}
                </div>
            )}
            <div className={styles.reviewMeta}>
                {/* TODO: Получать имя пользователя по user_id */} 
                 {/* <span>Автор: {review.user_id}</span> */}
                <span>Опубликовано: {formatDate(review.created_at)}</span>
            </div>
        </div>
    );
}

export default function ReviewsPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated, supabase } = useAuth();
  const title = "Отзывы";

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка отзывов
  const fetchReviews = useCallback(async () => {
      setLoadingReviews(true);
      setError(null);
      console.log(`[${title}] Загрузка одобренных отзывов...`);

      try {
          const { data, error: fetchError } = await supabase
              .from('reviews') 
              .select('*') // Загружаем все поля
              .eq('status', 'approved') // Только одобренные
              .order('created_at', { ascending: false }); // Сначала новые
              // TODO: Добавить пагинацию

          if (fetchError) throw fetchError;
          
          console.log(`[${title}] Загружено ${data?.length ?? 0} отзывов.`);
          setReviews(data || []);
      } catch (err) {
          console.error(`[${title}] Ошибка загрузки отзывов:`, err);
          setError('Не удалось загрузить отзывы. Ошибка: ' + err.message);
      } finally {
          setLoadingReviews(false);
      }
  }, [title, supabase]);

  // useEffect для редиректа неавторизованных
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log(`[${title} Page] Not authenticated, redirecting to auth`);
      router.push(`/auth?next=/reviews`);
    }
  }, [authLoading, isAuthenticated, router, title]);

  // useEffect для загрузки отзывов
  useEffect(() => {
      if (isAuthenticated) {
          fetchReviews();
      }
  }, [isAuthenticated, fetchReviews]);

  if (authLoading) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div><p>Загрузка страницы отзывов...</p>
      </div>
    );
  }
  if (!isAuthenticated) { return null; }

  return (
    <div className={pageStyles.container}>
        <div className={styles.header}>
             <h1 className={styles.title}>{title}</h1>
             <button 
                 onClick={() => router.push('/reviews/create')} 
                 className={styles.createButton}
             >
                 ✍️ Написать отзыв
             </button>
        </div>

        {error && <div className={pageStyles.errorMessage} style={{ marginBottom: '1rem' }}>{error}</div>}

        {loadingReviews ? (
            <div className={pageStyles.loadingContainer}>
                <div className="spinner"></div><p>Загрузка отзывов...</p>
            </div>
        ) : reviews.length === 0 ? (
            <p className={styles.noReviews}>Пока нет ни одного отзыва. Станьте первым!</p>
        ) : (
            <div className={styles.reviewsList}>
                {reviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                ))}
            </div>
        )}
         <button onClick={() => router.back()} className={pageStyles.backButton} style={{ marginTop: '2rem' }}>
            &larr; Назад
       </button>
    </div>
  );
} 