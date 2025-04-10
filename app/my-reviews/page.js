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
    const { supabase, isAuthenticated, user } = useAuth(); // Добавил user для получения token
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null); // ID удаляемого отзыва

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
            // Используем user.id для получения сессии, если isAuthenticated гарантирует наличие user
            if (!user?.id) {
                setError('Пользователь не найден для получения сессии.');
                setLoading(false);
                console.warn('[MyReviewsPage] User object not available for session.');
                return;
            }
            const session = await supabase.auth.getSession(); // Получаем текущую сессию
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
    }, [isAuthenticated, supabase, user]); // Добавил user в зависимости

    useEffect(() => {
        // Ждем аутентификации перед загрузкой
        if (isAuthenticated !== null) { // Проверяем, что статус аутентификации определен
             if (isAuthenticated) {
                 fetchMyReviews();
             } else {
                 setError('Для просмотра отзывов необходимо авторизоваться.');
                 setLoading(false);
             }
        }
    }, [isAuthenticated, fetchMyReviews]); // Убрал supabase и user, т.к. они в fetchMyReviews

    // --- Функция удаления отзыва ---
    const handleDelete = useCallback(async (reviewId) => {
        if (!reviewId) return;

        const confirmed = window.confirm("Братан, ты реально хочешь снести этот отзыв? Назад пути не будет.");
        if (!confirmed) return;

        setDeletingId(reviewId); // Показываем лоадер для конкретной карточки
        setError(null); // Сбрасываем предыдущие ошибки

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('Токен авторизации не найден. Попробуй перезайти.');
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
            setError(`Не удалось удалить отзыв: ${deleteError.message}`);
        } finally {
            setDeletingId(null); // Убираем лоадер
        }
    }, [supabase]); // Убрал user и isAuthenticated, получаем токен внутри

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
                        <div key={review.id} className={`${styles.reviewCard} ${deletingId === review.id ? styles.deleting : ''}`}>
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
                            
                            {/* --- Блок с кнопками --- */}
                            <div className={styles.reviewActions}>
                                <button 
                                    onClick={() => router.push(`/reviews/edit/${review.id}`)} 
                                    className={`${styles.actionButton} ${styles.editButton}`}
                                    disabled={deletingId === review.id} // Блокируем во время удаления
                                >
                                    ✏️ Редактировать
                                </button>
                                <button 
                                    onClick={() => handleDelete(review.id)} 
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    disabled={deletingId === review.id} // Блокируем во время удаления
                                >
                                    {deletingId === review.id ? 'Удаляю...' : '❌ Удалить'}
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