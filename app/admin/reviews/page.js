'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
// import { supabaseAdmin } from '../../../utils/supabase/admin'; // Убрали импорт Admin клиента
import styles from './admin-reviews.module.css'; // Стили создадим позже
import pageStyles from '../../../styles/page.module.css'; // Исправленный путь
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import RouteGuard from '../../components/RouteGuard';

// Функция форматирования даты (можно вынести)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

function AdminReviewsContent() {
    const router = useRouter();
    const { userRole, supabase } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null); // ID отзыва, который обновляется
    const { t } = useTranslation();

    const isAdminUser = userRole === 'admin';

    const fetchReviews = useCallback(async () => {
        if (!isAdminUser) {
            setError("Access denied. You must be an admin.");
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Authentication session not found.");
            
            const response = await fetch('/api/admin/reviews', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch reviews for moderation.');
            }
            const data = await response.json();
            setReviews(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isAdminUser, supabase]);

    useEffect(() => {
        if (userRole === 'user') {
            // Если пользователь не админ, отправляем его в меню
            router.push('/menu');
        } else if (userRole === 'admin') {
            // Если админ, загружаем отзывы
            fetchReviews();
        }
        // Если userRole еще null (идет загрузка), ничего не делаем, ждем
    }, [userRole, fetchReviews, router]);

    const handleUpdateStatus = async (reviewId, newStatus) => {
        const confirmAction = window.confirm(
            newStatus === 'approved' 
                ? t('admin_reviews.confirmApprove') 
                : t('admin_reviews.confirmReject')
        );
        if (!confirmAction) return;

        setUpdatingId(reviewId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Authentication session not found.");

            const response = await fetch(`/api/admin/reviews/moderate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ reviewId, status: newStatus }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }
            // Обновляем статус локально
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
        } catch (err) {
            setError(t('admin_reviews.updateError', { message: err.message }));
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className={pageStyles.container}>
                <header className={styles.header}>
                    <Link href="/menu" className={styles.backLink}>
                        <FaArrowLeft /> {t('admin_reviews.backToMenu')}
                    </Link>
                </header>
                <div className={pageStyles.loadingContainer}>
                    <p>Загрузка отзывов...</p>
                </div>
            </div>
        );
    }
    
    // Если пользователь не админ, но загрузка завершилась (например, из-за ошибки)
    if (!isAdminUser) {
        return (
            <div className={pageStyles.container}>
                <p>{error || "Access Denied."}</p>
                <Link href="/menu" className={styles.backLink}>
                    <FaArrowLeft /> {t('admin_reviews.backToMenu')}
                </Link>
            </div>
        )
    }

    return (
        <div className={pageStyles.container}>
            <header className={styles.header}>
                <Link href="/menu" className={styles.backLink}>
                    <FaArrowLeft /> {t('admin_reviews.backToMenu')}
                </Link>
                <h1>{t('admin_reviews.title')}</h1>
                <p>{t('admin_reviews.totalReviews', { count: reviews.length })}</p>
            </header>
            
            {error && <p className={pageStyles.errorMessage}>{error}</p>}

            {reviews.length === 0 && (
                <div className={styles.noReviews}>
                    <p>{t('admin_reviews.noReviews')}</p>
                </div>
            )}

            {!loading && reviews.length > 0 && (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('admin_reviews.author')}</th>
                                <th>{t('admin_reviews.streamer')}</th>
                                <th>{t('admin_reviews.reviewText')}</th>
                                <th>{t('admin_reviews.status')}</th>
                                <th>{t('admin_reviews.date')}</th>
                                <th>{t('admin_reviews.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map((review) => (
                                <tr key={review.id}>
                                    <td>{review.user_name}</td>
                                    <td>{review.streamer_display_name}</td>
                                    <td>{review.review_text}</td>
                                    <td>
                                        <span className={`${styles.status} ${styles[review.status]}`}>
                                            {t(`admin_reviews.${review.status}`, { defaultValue: review.status })}
                                        </span>
                                    </td>
                                    <td>{formatDate(review.created_at)}</td>
                                    <td className={styles.actions}>
                                        <button 
                                            className={`${styles.button} ${styles.approve}`}
                                            onClick={() => handleUpdateStatus(review.id, 'approved')}
                                            disabled={updatingId === review.id || review.status === 'approved'}
                                        >
                                            {updatingId === review.id ? t('admin_reviews.approving') : t('admin_reviews.approve')}
                                        </button>
                                        <button 
                                            className={`${styles.button} ${styles.reject}`}
                                            onClick={() => handleUpdateStatus(review.id, 'rejected')}
                                            disabled={updatingId === review.id || review.status === 'rejected'}
                                        >
                                            {updatingId === review.id ? t('admin_reviews.rejecting') : t('admin_reviews.reject')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function AdminReviewsPage() {
    return (
        <RouteGuard adminOnly={true}>
            <AdminReviewsContent />
        </RouteGuard>
    )
} 