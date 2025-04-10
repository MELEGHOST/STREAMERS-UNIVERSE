'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './admin-reviews.module.css'; // Стили создадим позже
import pageStyles from '../../../../styles/page.module.css';

// Функция форматирования даты (можно вынести)
const formatDate = (dateString) => {
  if (!dateString) return 'Неизвестно';
  try {
    return new Date(dateString).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'Неверная дата'; }
};

export default function AdminReviewsPage() {
    const router = useRouter();
    const { user, isLoading, isAuthenticated, supabase, userRole } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null); // ID отзыва, который обновляется

    const isAdminUser = userRole === 'admin';

    const fetchPendingReviews = useCallback(async () => {
        if (!isAdminUser || !supabase) return;
        setLoadingReviews(true);
        setError(null);
        console.log('[AdminReviews] Fetching pending reviews...');
        
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) throw new Error('Auth token not found');

            const response = await fetch('/api/admin/reviews?status=pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || `Failed to fetch: ${response.statusText}`);
            }
            const data = await response.json();
            setReviews(data);
            console.log(`[AdminReviews] Fetched ${data.length} pending reviews.`);
        } catch (err) {
            console.error('[AdminReviews] Error fetching reviews:', err);
            setError(err.message || 'Failed to load reviews.');
        } finally {
            setLoadingReviews(false);
        }
    }, [isAdminUser, supabase]);

    const updateReviewStatus = useCallback(async (reviewId, newStatus) => {
        if (!isAdminUser || !supabase) return;
        setUpdatingId(reviewId); // Показываем лоадер для этой карточки
        setError(null);
        console.log(`[AdminReviews] Updating review ${reviewId} to ${newStatus}...`);
        
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) throw new Error('Auth token not found');

            const response = await fetch('/api/admin/reviews', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reviewId, newStatus })
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || `Failed to update: ${response.statusText}`);
            }
             console.log(`[AdminReviews] Review ${reviewId} status updated successfully.`);
            // Обновляем список, удаляя обработанный отзыв
            setReviews(prev => prev.filter(r => r.id !== reviewId)); 
        } catch (err) {
            console.error(`[AdminReviews] Error updating review ${reviewId}:`, err);
            setError(`Ошибка обновления отзыва ${reviewId}: ${err.message}`);
        } finally {
            setUpdatingId(null);
        }
    }, [isAdminUser, supabase]);

    useEffect(() => {
        // Проверка прав доступа на клиенте
        if (!isLoading && !isAdminUser) {
            console.warn('[AdminReviews] User is not admin. Redirecting...');
            router.push('/menu'); // Или на главную, или показать 403
        } else if (isAdminUser) {
            fetchPendingReviews();
        }
    }, [isLoading, isAuthenticated, isAdminUser, router, fetchPendingReviews]);

    // --- Рендеринг ---
    if (isLoading || (!isAdminUser && !isLoading)) { // Показываем загрузку, пока идет проверка прав
        return (
            <div className={pageStyles.loadingContainer}>
                <div className="spinner"></div>
                <p>Загрузка...</p>
            </div>
        );
    }
    
    return (
        <div className={pageStyles.container}>
            <h1 className={styles.title}>Модерация Отзывов</h1>
            
            {error && <p className={pageStyles.errorMessage}>{error}</p>}

            {loadingReviews && (
                 <div className={pageStyles.loadingContainer}>
                     <div className="spinner"></div>
                     <p>Загрузка отзывов...</p>
                 </div>
            )}

            {!loadingReviews && reviews.length === 0 && (
                <p className={styles.noReviewsMessage}>Нет отзывов, ожидающих модерации.</p>
            )}

            {!loadingReviews && reviews.length > 0 && (
                <div className={styles.reviewsGrid}> 
                    {reviews.map(review => (
                        <div key={review.id} className={`${styles.reviewCard} ${updatingId === review.id ? styles.updating : ''}`}>
                            {updatingId === review.id && <div className={styles.cardLoader}><div className="spinner-small"></div></div>}
                            <div className={styles.reviewMeta}>
                                <span><b>Автор:</b> {review.author_nickname}</span>
                                <span><b>Объект:</b> {review.item_name}</span>
                                <span><b>Категория:</b> {review.category}{review.subcategory ? ` / ${review.subcategory}`: ''}</span>
                                <span><b>Дата:</b> {formatDate(review.created_at)}</span>
                                {review.rating && <span><b>Рейтинг:</b> {review.rating}/5</span>}
                                {review.is_generated && <span className={styles.aiBadge}>AI</span>}
                            </div>
                            {review.image_url && (
                                <img src={review.image_url} alt="Review image" className={styles.reviewImage}/>
                            )}
                            <p className={styles.reviewText}>{review.review_text}</p>
                            {review.source_info && <p className={styles.sourceInfo}><i>Источник ИИ:</i> {review.source_info}</p>}
                            
                            <div className={styles.actions}>
                                <button 
                                    onClick={() => updateReviewStatus(review.id, 'approved')} 
                                    className={`${styles.actionButton} ${styles.approveButton}`}
                                    disabled={!!updatingId}
                                >
                                    Одобрить
                                </button>
                                <button 
                                    onClick={() => updateReviewStatus(review.id, 'rejected')} 
                                    className={`${styles.actionButton} ${styles.rejectButton}`}
                                     disabled={!!updatingId}
                                >
                                    Отклонить
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 