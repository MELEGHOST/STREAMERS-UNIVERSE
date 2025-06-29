'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
// import { supabaseAdmin } from '../../../utils/supabase/admin'; // Убрали импорт Admin клиента
import styles from './admin-reviews.module.css'; // Стили создадим позже
import pageStyles from '../../../styles/page.module.css'; // Исправленный путь
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

// Функция форматирования даты (можно вынести)
const formatDate = (dateString) => {
  if (!dateString) return 'Неизвестно';
  try {
    return new Date(dateString).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'Неверная дата'; }
};

function AdminReviewsPageContent() {
    const router = useRouter();
    const { supabase, isAuthenticated, userRole, user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null); // ID отзыва, который обновляется

    const isAdminUser = userRole === 'admin';

    useEffect(() => {
        const fetchReviews = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('reviews')
                .select(`*, profiles(twitch_user_name)`)
                .eq('moderation_status', 'pending');

            if (error) {
                console.error("Ошибка при загрузке отзывов на модерацию:", error);
                // Тут можно было бы показать состояние ошибки
            } else {
                setReviews(data);
            }
            setLoading(false); // Устанавливаем в false в любом случае
        };

        fetchReviews();
    }, [supabase]);

    const updateReviewStatus = useCallback(async (reviewId, newStatus) => {
        if (!reviewId || !newStatus || !isAuthenticated || !supabase || !user) {
            console.error('[AdminReviewsPage] Missing data for status update');
            setError('Недостаточно данных для обновления статуса.');
            return;
        }

        setUpdatingId(reviewId); // Показываем лоадер
        setError(null);

        try {
             const session = await supabase.auth.getSession();
             const token = session.data.session?.access_token;

            if (!token) {
                throw new Error("Токен авторизации не найден.");
            }

            const response = await fetch(`/api/admin/reviews/${reviewId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
            }

            // Успешно - убираем отзыв из списка локально
            setReviews(prevReviews => prevReviews.filter(r => r.id !== reviewId));
            console.log(`[AdminReviewsPage] Review ${reviewId} status updated to ${newStatus}.`);

        } catch (updateError) {
            console.error(`[AdminReviewsPage] Error updating review ${reviewId}:`, updateError);
            setError(`Не удалось обновить статус отзыва: ${updateError.message}`);
        } finally {
            setUpdatingId(null); // Убираем лоадер
        }
    }, [isAuthenticated, supabase, user]);

    useEffect(() => {
        // Проверка прав доступа на клиенте
        if (!isAuthenticated && !isAdminUser) {
            console.warn('[AdminReviews] User is not admin. Redirecting...');
            router.push('/menu'); // Или на главную, или показать 403
        } else if (isAdminUser) {
            // fetchPendingReviews();
        }
    }, [isAuthenticated, isAdminUser, router]);

    // --- Рендеринг ---
    if (!isAuthenticated || (!isAdminUser && !isAuthenticated)) { // Показываем загрузку, пока идет проверка прав
        return (
            <div className={pageStyles.loadingContainer}>
                <div className="spinner"></div>
                <p>Загрузка...</p>
            </div>
        );
    }
    
    return (
        <div className={pageStyles.container}>
            <div className={styles.adminHeader}>
                <Link href="/menu" className={styles.backButton}>
                    <FaArrowLeft /> Назад в меню
                </Link>
                <h1 className={styles.title}>Модерация отзывов</h1>
            </div>
            
            {error && <p className={pageStyles.errorMessage}>{error}</p>}

            {loading && (
                 <div className={pageStyles.loadingContainer}>
                     <div className="spinner"></div>
                     <p>Загрузка отзывов...</p>
                 </div>
            )}

            {reviews.length === 0 && (
                <div className={styles.noReviews}>
                    <p>Нет отзывов, ожидающих модерации. Свобода!</p>
                </div>
            )}

            {!loading && reviews.length > 0 && (
                <div className={styles.reviewsGrid}> 
                    {reviews.map((review) => (
                        <div 
                            key={review.id} 
                            className={`${styles.reviewCard} ${updatingId === review.id ? styles.cardLoader : ''}`}
                        >
                             {/* Лоадер поверх карточки */} 
                             {updatingId === review.id && <div className={styles.spinner}></div>}
                            
                            {/* --- Блок с автором --- */}
                             <div className={styles.reviewMeta}>
                                 <div className={styles.authorInfo}>
                                     {/* ИСПОЛЬЗУЕМ NEXT/IMAGE ДЛЯ АВАТАРА АВТОРА */} 
                                     {review.author_avatar_url ? (
                                         <Image 
                                             src={review.author_avatar_url}
                                             alt={`Аватар ${review.author_nickname}`}
                                             width={30} 
                                             height={30}
                                             className={styles.authorAvatar} // Нужен стиль для этого
                                             unoptimized // Если аватары внешние
                                         />
                                     ) : (
                                         <div className={styles.authorAvatarPlaceholder}></div> // Заглушка, если аватара нет
                                     )}
                                     <span className={styles.authorNickname}>{review.author_nickname || 'Аноним'}</span>
                                 </div>
                                <span className={styles.reviewDate}>{formatDate(review.created_at)}</span>
                            </div>
                            {/* --- Конец блока с автором --- */}
                            
                            <div className={styles.itemInfo}>
                                <span className={styles.itemName}>{review.item_name}</span>
                                <span className={styles.itemCategory}>({review.category}{review.subcategory ? ` / ${review.subcategory}` : ''})</span>
                             </div>

                            {review.image_url && (
                                 <Image 
                                    src={review.image_url}
                                    alt={`Изображение для ${review.item_name}`}
                                    width={100}
                                    height={100}
                                    className={styles.reviewImage}
                                    style={{ objectFit: 'contain' }}
                                    unoptimized
                                />
                             )}

                            <p className={styles.reviewText}>{review.review_text}</p>
                            
                             <div className={styles.rating}>Рейтинг: {review.rating}/5</div>
                            
                            <div className={styles.reviewActions}>
                                <button
                                    onClick={() => updateReviewStatus(review.id, 'approved')}
                                     className={`${styles.actionButton} ${styles.approveButton}`}
                                    disabled={updatingId === review.id}
                                >
                                     {updatingId === review.id ? '...' : '✅ Одобрить'}
                                 </button>
                                <button
                                    onClick={() => updateReviewStatus(review.id, 'rejected')}
                                    className={`${styles.actionButton} ${styles.rejectButton}`}
                                    disabled={updatingId === review.id}
                                >
                                     {updatingId === review.id ? '...' : '❌ Отклонить'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AdminReviewsPage() {
    return (
        <AdminReviewsPageContent />
    )
} 