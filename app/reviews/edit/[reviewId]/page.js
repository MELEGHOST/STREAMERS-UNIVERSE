'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext'; // Путь вроде верный
import styles from '../edit-review.module.css'; // ИСПРАВЛЕННЫЙ ПУТЬ
import pageStyles from '../../../../styles/page.module.css'; // Путь вроде верный

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
    const { supabase, isAuthenticated, user } = useAuth();

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
                 setError("Для редактирования отзыва необходимо авторизоваться.");
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
                throw new Error("Токен авторизации не найден.");
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
                     throw new Error("Отзыв не найден.");
                } else if (response.status === 403) {
                    throw new Error("У вас нет прав на редактирование этого отзыва.");
                }
                 else {
                     throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
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
            setError(`Не удалось загрузить данные отзыва: ${fetchError.message}`);
        } finally {
            setLoading(false);
        }
    }, [reviewId, isAuthenticated, supabase]); // Убрал user из зависимостей

    useEffect(() => {
        if (isAuthenticated !== null) { // Ждем определения статуса аутентификации
            if (isAuthenticated) {
                fetchReviewData();
            } else {
                setError("Для редактирования отзыва необходимо авторизоваться.");
                setLoading(false);
                // Можно редирект на логин или /my-reviews
                 // router.push('/login');
            }
        }
    }, [isAuthenticated, fetchReviewData]);

    // Обработчик сохранения
    const handleSave = async (event) => {
        event.preventDefault();
        if (!reviewData || isSaving) return;

        // Простая валидация
        if (!editText.trim()) {
            setError("Текст отзыва не может быть пустым, ебана.");
            return;
        }
         if (editRating < 1 || editRating > 5) {
            setError("Рейтинг должен быть от 1 до 5 звезд.");
            return;
        }

        setIsSaving(true);
        setError(null);
        console.log(`[EditReviewPage] Saving review ${reviewId}`);

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
             if (!token) {
                throw new Error("Токен авторизации не найден.");
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
                 throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
            }

            const result = await response.json(); // Получаем ответ от PATCH
            console.log(`[EditReviewPage] Review ${reviewId} saved successfully. Response:`, result);

            // Можно показать сообщение об успехе перед редиректом
            alert("Отзыв успешно сохранен!"); // Временное решение
            router.push('/my-reviews'); // Возвращаемся к списку

        } catch (saveError) {
             console.error(`[EditReviewPage] Error saving review ${reviewId}:`, saveError);
            setError(`Не удалось сохранить отзыв: ${saveError.message}`);
             setIsSaving(false); // Разблокируем кнопку при ошибке
        }
        // setIsSaving(false) // Это нужно делать только при ошибке, при успехе - редирект
    };

    // Рендеринг
    if (loading) {
        return (
             <div className={pageStyles.loadingContainer}>
                <div className="spinner"></div>
                 <p>Загрузка данных для редактирования...</p>
             </div>
        );
    }

    if (error && !reviewData) { // Показываем критическую ошибку, если данные не загрузились
        return (
            <div className={pageStyles.container}>
                <h1 className={styles.title}>Ошибка редактирования</h1>
                <p className={pageStyles.errorMessage}>{error}</p>
                <button onClick={() => router.push('/my-reviews')} className={pageStyles.button}>Назад к моим отзывам</button>
            </div>
        );
    }

    // Если ревью не найдено (например, уже удалено), но ошибка не критическая
    if (!reviewData) {
         return (
            <div className={pageStyles.container}>
                <h1 className={styles.title}>Отзыв не найден</h1>
                 <p>Возможно, он был удален.</p>
                <button onClick={() => router.push('/my-reviews')} className={pageStyles.button}>Назад к моим отзывам</button>
            </div>
        );
    }


    return (
        <div className={pageStyles.container}>
            <h1 className={styles.title}>Редактировать отзыв</h1>
             <p className={styles.itemName}>Объект: {reviewData.item_name || 'Неизвестно'}</p>
            <p className={styles.category}>Категория: {reviewData.category || 'Неизвестно'}</p>

             {error && <p className={pageStyles.errorMessage}>{error}</p>} {/* Ошибки валидации/сохранения */}

            <form onSubmit={handleSave} className={styles.editForm}>
                <div className={styles.formGroup}>
                     <label htmlFor="rating" className={styles.label}>Рейтинг:</label>
                     <StarRating rating={editRating} setRating={setEditRating} disabled={isSaving} />
                 </div>

                <div className={styles.formGroup}>
                    <label htmlFor="reviewText" className={styles.label}>Текст отзыва:</label>
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
                         Отмена
                     </button>
                    <button type="submit" disabled={isSaving} className={`${pageStyles.button} ${styles.saveButton}`}>
                        {isSaving ? 'Сохраняю...' : 'Сохранить изменения'}
                     </button>
                 </div>
             </form>
        </div>
    );
} 