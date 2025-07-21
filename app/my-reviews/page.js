'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './my-reviews.module.css'; // Стили создадим позже
import pageStyles from '../../styles/page.module.css'; // Общие стили
import RouteGuard from '../components/RouteGuard';
import { useTranslation } from 'react-i18next';

// Функция форматирования даты (можно вынести в utils)
const formatDate = (dateString, t) => {
  if (!dateString) return t('my_reviews.unknownDate');
  try {
    // Язык возьмется из i18n
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return t('my_reviews.invalidDate'); }
};

function MyReviewsPageContent() {
    const router = useRouter();
    const { supabase, isAuthenticated, user } = useAuth(); // Добавил user для получения token
    const { t } = useTranslation();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null); // ID удаляемого отзыва

    const fetchMyReviews = useCallback(async () => {
        console.log('[MyReviewsPage] Fetching reviews...');
        setLoading(true);
        setError(null);

        if (!isAuthenticated || !supabase) {
            setError(t('my_reviews.authRequired'));
            setLoading(false);
            console.warn('[MyReviewsPage] User not authenticated or supabase client not available.');
            return;
        }

        try {
            // Используем user.id для получения сессии, если isAuthenticated гарантирует наличие user
            if (!user?.id) {
                setError(t('my_reviews.userNotFound'));
                setLoading(false);
                console.warn('[MyReviewsPage] User object not available for session.');
                return;
            }
            const session = await supabase.auth.getSession(); // Получаем текущую сессию
            const token = session.data.session?.access_token;

            if (!token) {
                setError(t('my_reviews.tokenFailed'));
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
                const errorMsg = t('my_reviews.apiError', { status: response.status, error: errorData.error || response.statusText });
                console.error('[MyReviewsPage] API Error:', errorMsg);
                setError(errorMsg);
            } else {
                const data = await response.json();
                console.log('[MyReviewsPage] Reviews fetched successfully:', data);
                setReviews(data);
            }
        } catch (fetchError) {
            console.error('[MyReviewsPage] Fetch error:', fetchError);
            setError(t('my_reviews.criticalLoadError', { message: fetchError.message }));
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, supabase, user, t]); // Добавил t в зависимости

    useEffect(() => {
        // Ждем аутентификации перед загрузкой
        if (isAuthenticated !== null) { // Проверяем, что статус аутентификации определен
             if (isAuthenticated) {
                 fetchMyReviews();
             } else {
                 setError(t('my_reviews.authRequired'));
                 setLoading(false);
             }
        }
    }, [isAuthenticated, fetchMyReviews, t]); // Добавил t

    // --- Функция удаления отзыва ---
    const handleDelete = useCallback(async (reviewId) => {
        if (!reviewId) return;

        const confirmed = window.confirm(t('my_reviews.deleteConfirm'));
        if (!confirmed) return;

        setDeletingId(reviewId); // Показываем лоадер для конкретной карточки
        setError(null); // Сбрасываем предыдущие ошибки

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error(t('my_reviews.tokenNotFound'));
            }

            const response = await fetch(`/api/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
            }

            // Успешно удалено - обновляем список локально
            setReviews(prevReviews => prevReviews.filter(r => r.id !== reviewId));
            console.log(`[MyReviewsPage] Review ${reviewId} deleted successfully.`);

        } catch (deleteError) {
            console.error(`[MyReviewsPage] Error deleting review ${reviewId}:`, deleteError);
            setError(t('my_reviews.deleteFailed', { message: deleteError.message }));
        } finally {
            setDeletingId(null); // Убираем лоадер
        }
    }, [supabase, t]); // Добавил t

    // --- Рендеринг --- 

    if (loading) {
        return (
            <div className={pageStyles.loadingContainer}>
                <p>Загрузка отзывов...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={pageStyles.container}>
                 <div className={styles.header}>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        &larr; {t('my_reviews.back')}
                    </button>
                    <h1 className={styles.title}>{t('my_reviews.title', { count: 0 })}</h1>
                </div>
                <div className={pageStyles.errorMessage}>
                    <p>{error}</p>
                    <button onClick={fetchMyReviews} className={styles.actionButton}>
                        {t('my_reviews.retry')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={pageStyles.container}> 
            <div className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    &larr; {t('my_reviews.back')}
                </button>
                <h1 className={styles.title}>{t('my_reviews.title', { count: reviews.length })}</h1>
            </div>

            {reviews.length === 0 && (
                 <div className={styles.noReviewsContainer}>
                    <p className={styles.noReviewsMessage}>{t('my_reviews.noReviews')}</p>
                    <button onClick={() => router.push('/search')} className={styles.actionButton}>
                        {t('my_reviews.findStreamer')}
                    </button>
                </div>
            )}
            
            {reviews.length > 0 && (
                <div className={styles.reviewsList}>
                    {reviews.map(review => (
                        <div key={review.id} className={`${styles.reviewCard} ${deletingId === review.id ? styles.deleting : ''}`}>
                           <div className={styles.reviewHeader}>
                                <Link href={`/profile/${review.streamer_twitch_id}`} className={styles.streamerInfo}>
                                    {review.streamer_profile_image_url && (
                                        <Image 
                                            src={review.streamer_profile_image_url}
                                            alt={t('my_reviews.avatarAlt', { name: review.streamer_display_name })}
                                            width={40}
                                            height={40}
                                            className={styles.streamerAvatar}
                                            unoptimized
                                        />
                                    )}
                                    <span className={styles.streamerName}>{review.streamer_display_name || t('my_reviews.unknownStreamer')}</span>
                                </Link>
                                <span className={styles.reviewDate}>{formatDate(review.created_at, t)}</span>
                           </div>
                            <p className={styles.reviewText}>{review.review_text}</p>
                            
                            {/* --- Блок с кнопками --- */}
                            <div className={styles.reviewActions}>
                                <button 
                                    onClick={() => router.push(`/reviews/edit/${review.id}`)} 
                                    className={`${styles.actionButton} ${styles.editButton}`}
                                    disabled={deletingId === review.id} // Блокируем во время удаления
                                >
                                    {t('my_reviews.edit')}
                                </button>
                                <button 
                                    onClick={() => handleDelete(review.id)} 
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    disabled={deletingId === review.id} // Блокируем во время удаления
                                >
                                    {deletingId === review.id ? t('my_reviews.deleting') : t('my_reviews.delete')}
                                </button>
                            </div>
                            {/* --------------------- */}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function MyReviewsPage() {
    return (
        <RouteGuard>
            <MyReviewsPageContent />
        </RouteGuard>
    )
} 