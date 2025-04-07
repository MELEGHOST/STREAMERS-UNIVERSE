'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './my-reviews.module.css'; // Стили создадим позже
import pageStyles from '../../styles/page.module.css'; // Общие стили

// Функция форматирования даты (можно вынести в utils)
const formatDate = (dateString) => {
  if (!dateString) return 'Неизвестно';
  try {
    return new Date(dateString).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'Неверная дата'; }
};

export default function MyReviewsPage() {
    const router = useRouter();
    const { supabase, user, isAuthenticated } = useAuth(); // Получаем нужные данные из контекста
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMyReviews = useCallback(async () => {
        console.log('[MyReviewsPage] Fetching reviews...');
        setLoading(true);
        setError(null);

        if (!isAuthenticated || !supabase) {
            setError('Для просмотра отзывов необходимо авторизоваться.');
            setLoading(false);
            console.warn('[MyReviewsPage] User not authenticated or supabase client not available.');
            return;
        }

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                setError('Не удалось получить токен авторизации.');
                setLoading(false);
                 console.warn('[MyReviewsPage] Failed to get auth token.');
                return;
            }

            const response = await fetch('/api/reviews/my', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMsg = `Ошибка ${response.status}: ${errorData.error || response.statusText}`;
                console.error('[MyReviewsPage] API Error:', errorMsg);
                setError(errorMsg);
            } else {
                const data = await response.json();
                console.log('[MyReviewsPage] Reviews fetched successfully:', data);
                setReviews(data);
            }
        } catch (fetchError) {
            console.error('[MyReviewsPage] Fetch error:', fetchError);
            setError(`Критическая ошибка загрузки: ${fetchError.message}`);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, supabase]);

    useEffect(() => {
        fetchMyReviews();
    }, [fetchMyReviews]);

    // --- Рендеринг --- 

    if (loading) {
        return (
            <div className={pageStyles.loadingContainer}> 
                <div className="spinner"></div>
                <p>Загрузка ваших отзывов...</p>
            </div>
        );
    }

    return (
        <div className={pageStyles.container}> 
            <div className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    &larr; Назад
                </button>
                <h1 className={styles.title}>Мои Отзывы ({reviews.length})</h1>
            </div>

            {error && <p className={pageStyles.errorMessage}>{error}</p>}

            {!error && reviews.length === 0 && (
                <p className={styles.noReviewsMessage}>Вы еще не оставили ни одного отзыва.</p>
            )}

            {!error && reviews.length > 0 && (
                <div className={styles.reviewsList}>
                    {reviews.map(review => (
                        <div key={review.id} className={styles.reviewCard}>
                           <div className={styles.reviewHeader}>
                                <Link href={`/profile/${review.streamer_twitch_id}`} className={styles.streamerInfo}>
                                    {review.streamer_profile_image_url && (
                                        <Image 
                                            src={review.streamer_profile_image_url}
                                            alt={`Аватар ${review.streamer_display_name}`}
                                            width={40}
                                            height={40}
                                            className={styles.streamerAvatar}
                                            unoptimized
                                        />
                                    )}
                                    <span className={styles.streamerName}>{review.streamer_display_name || 'Неизвестный стример'}</span>
                                </Link>
                                <span className={styles.reviewDate}>{formatDate(review.created_at)}</span>
                           </div>
                            <p className={styles.reviewText}>{review.review_text}</p>
                             {/* Можно добавить рейтинг, если он есть */}
                             {/* review.rating && <p>Рейтинг: {review.rating}/5</p> */}
                            {/* Добавить кнопку Редактировать/Удалить? */}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 