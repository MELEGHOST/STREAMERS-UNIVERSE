'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext'; // Путь вроде верный
import styles from '../edit-review.module.css'; // ИСПРАВЛЕННЫЙ ПУТЬ
import pageStyles from '../../../../styles/page.module.css'; // Путь вроде верный
import { useTranslation } from 'react-i18next';
import Loader from '../../../components/Loader/Loader';

// Компонент для звездочек рейтинга (можно вынести)
const StarRating = ({ rating, setRating, disabled }) => {
    return (
        <div className={styles.starRating}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={`${styles.star} ${star <= rating ? styles.filled : ''} ${disabled ? styles.disabled : ''}`}
                    onClick={() => !disabled && setRating(star)}
                >
                    ★
                </span>
            ))}
        </div>
    );
};


export default function EditReviewPage() {
    const router = useRouter();
    const params = useParams();
    const { reviewId } = params;
    const { supabase, isAuthenticated } = useAuth();
    const { t } = useTranslation();

    const [reviewData, setReviewData] = useState(null);
    const [editText, setEditText] = useState('');
    const [editRating, setEditRating] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Загрузка данных отзыва
    const fetchReviewData = useCallback(async () => {
        if (!reviewId || !isAuthenticated || !supabase) {
             // Don't set error here if it's just initial state before auth check
             if (isAuthenticated === false) {
                 setError(t('edit_review.authRequired'));
             }
             setLoading(false);
            return;
        }
        console.log(`[EditReviewPage] Fetching review ${reviewId}`);
        setLoading(true);
        setError(null);

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error(t('edit_review.tokenNotFound'));
            }

            // Используем GET эндпоинт, который мы создали (пока с mock данными)
            const response = await fetch(`/api/reviews/${reviewId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // В реальном API GET нужно будет добавить проверку 403 Forbidden
                const errorData = await response.json();
                if (response.status === 404) {
                     throw new Error(t('edit_review.reviewNotFound'));
                } else if (response.status === 403) {
                    throw new Error(t('edit_review.forbidden'));
                }
                 else {
                     throw new Error(errorData.error || t('edit_review.serverError', { status: response.status }));
                 }
            }

            const data = await response.json();
             // Проверка, что пользователь редактирует свой отзыв (ВАЖНО добавить в реальный GET API)
            // if (user && data.user_id && user.id !== data.user_id) {
            //     throw new Error("У вас нет прав на редактирование этого отзыва (проверка на клиенте).");
            // }
            console.log(`[EditReviewPage] Review data fetched:`, data);
            setReviewData(data);
            setEditText(data.review_text || '');
            setEditRating(data.rating || 0);

        } catch (fetchError) {
            console.error(`[EditReviewPage] Error fetching review ${reviewId}:`, fetchError);
            setError(t('edit_review.loadError', { message: fetchError.message }));
        } finally {
            setLoading(false);
        }
    }, [reviewId, isAuthenticated, supabase, t]); // Убрал user из зависимостей

    useEffect(() => {
        if (isAuthenticated !== null) { // Ждем определения статуса аутентификации
            if (isAuthenticated) {
                fetchReviewData();
            } else {
                setError(t('edit_review.authRequired'));
                setLoading(false);
                // Можно редирект на логин или /my-reviews
                 // router.push('/login');
            }
        }
    }, [isAuthenticated, fetchReviewData, t]);

    // Обработчик сохранения
    const handleSave = async (event) => {
        event.preventDefault();
        if (!reviewData || isSaving) return;

        // Простая валидация
        if (!editText.trim()) {
            setError(t('edit_review.validation.emptyText'));
            return;
        }
         if (editRating < 1 || editRating > 5) {
            setError(t('edit_review.validation.invalidRating'));
            return;
        }

        setIsSaving(true);
        setError(null);
        console.log(`[EditReviewPage] Saving review ${reviewId}`);

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
             if (!token) {
                throw new Error(t('edit_review.tokenNotFound'));
            }

            // Вызываем PATCH эндпоинт (пока не реализован)
            const response = await fetch(`/api/reviews/${reviewId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    review_text: editText,
                    rating: editRating
                })
            });

             if (!response.ok) {
                const errorData = await response.json();
                 throw new Error(errorData.error || t('edit_review.serverError', { status: response.status }));
            }

            const result = await response.json(); // Получаем ответ от PATCH
            console.log(`[EditReviewPage] Review ${reviewId} saved successfully. Response:`, result);

            // Можно показать сообщение об успехе перед редиректом
            alert(t('edit_review.saveSuccess')); // Временное решение
            router.push('/my-reviews'); // Возвращаемся к списку

        } catch (saveError) {
             console.error(`[EditReviewPage] Error saving review ${reviewId}:`, saveError);
            setError(t('edit_review.saveError', { message: saveError.message }));
             setIsSaving(false); // Разблокируем кнопку при ошибке
        }
        // setIsSaving(false) // Это нужно делать только при ошибке, при успехе - редирект
    };

    // Рендеринг
    if (loading) {
        return (
             <div className={pageStyles.loadingContainer}>
                <Loader />
                 <p>{t('edit_review.loading')}</p>
             </div>
        );
    }

    if (error && !reviewData) { // Показываем критическую ошибку, если данные не загрузились
        return (
            <div className={pageStyles.container}>
                <h1 className={styles.title}>{t('edit_review.errorTitle')}</h1>
                <p className={pageStyles.errorMessage}>{error}</p>
                <button onClick={() => router.push('/my-reviews')} className={pageStyles.button}>{t('edit_review.backButton')}</button>
            </div>
        );
    }

    // Если ревью не найдено (например, уже удалено), но ошибка не критическая
    if (!reviewData) {
         return (
            <div className={pageStyles.container}>
                <h1 className={styles.title}>{t('edit_review.notFoundTitle')}</h1>
                 <p>{t('edit_review.notFoundText')}</p>
                <button onClick={() => router.push('/my-reviews')} className={pageStyles.button}>{t('edit_review.backButton')}</button>
            </div>
        );
    }


    return (
        <div className={pageStyles.container}>
            <h1 className={styles.title}>{t('edit_review.pageTitle')}</h1>
             <p className={styles.itemName}>{t('edit_review.objectLabel', { name: reviewData.item_name || t('edit_review.unknown') })}</p>
            <p className={styles.category}>{t('edit_review.categoryLabel', { category: reviewData.category || t('edit_review.unknown') })}</p>

             {error && <p className={pageStyles.errorMessage}>{error}</p>} {/* Ошибки валидации/сохранения */}

            <form onSubmit={handleSave} className={styles.editForm}>
                <div className={styles.formGroup}>
                     <label htmlFor="rating" className={styles.label}>{t('edit_review.ratingLabel')}</label>
                     <StarRating rating={editRating} setRating={setEditRating} disabled={isSaving} />
                 </div>

                <div className={styles.formGroup}>
                    <label htmlFor="reviewText" className={styles.label}>{t('edit_review.reviewTextLabel')}</label>
                     <textarea
                        id="reviewText"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className={styles.textarea}
                        rows="6"
                        required
                        disabled={isSaving}
                    />
                </div>

                <div className={styles.formActions}>
                    <button type="button" onClick={() => router.push('/my-reviews')} disabled={isSaving} className={`${pageStyles.button} ${styles.cancelButton}`}>
                         {t('edit_review.cancelButton')}
                     </button>
                    <button type="submit" disabled={isSaving} className={`${pageStyles.button} ${styles.saveButton}`}>
                        {isSaving ? t('edit_review.savingButton') : t('edit_review.saveButton')}
                     </button>
                 </div>
             </form>
        </div>
    );
} 