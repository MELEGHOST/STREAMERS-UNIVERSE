'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './admin-reviews.module.css';
import pageStyles from '../../../../styles/page.module.css';

export default function AdminReviewsPage() {
  const { user, isLoading, isAuthenticated, supabase } = useAuth();
  const router = useRouter();
  const title = "Модерация Отзывов";

  const [pendingReviews, setPendingReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [error, setError] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false); // Состояние для проверки админа

  // Проверка роли админа на клиенте (дополнительная проверка)
  const checkAdminRole = useCallback(async () => {
      if (!user || !supabase) return false;
      try {
          const { data, error } = await supabase
              .from('user_profiles')
              .select('role')
              .eq('user_id', user.id)
              .single();
          if (error || !data) return false;
          return data.role === 'admin';
      } catch { return false; }
  }, [user, supabase]);

  // Загрузка ожидающих отзывов
  const fetchPendingReviews = useCallback(async () => {
      if (!supabase) return;
      setLoadingReviews(true);
      setError(null);
      try {
          const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
          const response = await fetch('/api/admin/reviews', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.status === 403) {
             setError('Доступ запрещен. Только администраторы могут просматривать эту страницу.');
             setIsAdminUser(false); // Пользователь не админ
             setPendingReviews([]);
             return;
          } 
          if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || `Ошибка загрузки отзывов (${response.status})`);
          }
          const data = await response.json();
          setPendingReviews(data || []);
      } catch (err) {
          console.error(`[${title}] Ошибка загрузки ожидающих отзывов:`, err);
          setError('Не удалось загрузить отзывы для модерации: ' + err.message);
      } finally {
          setLoadingReviews(false);
      }
  }, [supabase, title]);

  // Модерация (одобрить/отклонить)
  const moderateReview = async (reviewId, newStatus) => {
      setError(null);
      try {
           const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
           const response = await fetch('/api/admin/reviews/moderate', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ reviewId, newStatus })
           });
            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || `Ошибка модерации (${response.status})`);
            }
            // Обновляем список, убирая отмодерированный отзыв
            setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
            alert(`Отзыв успешно ${newStatus === 'approved' ? 'одобрен' : 'отклонен'}!`);

      } catch (err) {
            console.error(`[${title}] Ошибка модерации отзыва ${reviewId}:`, err);
            setError('Ошибка модерации: ' + err.message);
            // Можно добавить alert об ошибке
      }
  };

   // useEffect для проверки роли и загрузки данных
   useEffect(() => {
       if (!isLoading && !isAuthenticated) {
           router.push('/auth?next=/admin/reviews');
       } else if (isAuthenticated && user && supabase) {
           checkAdminRole().then(isAdminResult => {
               setIsAdminUser(isAdminResult); // Сохраняем результат проверки
               if (isAdminResult) {
                   fetchPendingReviews();
               } else {
                   setError('Доступ запрещен. У вас нет прав администратора.');
                   setLoadingReviews(false); // Останавливаем загрузку
               }
           });
       } else if (!isLoading && isAuthenticated && !user) {
            setError("Ошибка аутентификации."); // Странная ситуация
            setLoadingReviews(false);
       }
   }, [isLoading, isAuthenticated, user, supabase, router, checkAdminRole, fetchPendingReviews]);


  // --- Рендеринг --- 
  if (isLoading || (isAuthenticated && loadingReviews && !error)) { // Показываем загрузку, если грузим или проверяем админа
      return (
          <div className={pageStyles.loadingContainer}>
              <div className="spinner"></div><p>Загрузка модерации...</p>
          </div>
      );
  }

  if (!isAuthenticated || !isAdminUser) { // Если не авторизован или не админ (после проверки)
       return (
            <div className={pageStyles.container}>
                <h1 className={styles.title}>{title}</h1>
                <p className={pageStyles.errorMessage}>{error || 'Доступ запрещен.'}</p>
                 <button onClick={() => router.push('/admin')} className={pageStyles.backButton}>
                    &larr; Назад в Админ панель
                 </button>
            </div>
        );
  }

  return (
    <div className={pageStyles.container}>
        <h1 className={styles.title}>{title}</h1>
        
        {error && <div className={pageStyles.errorMessage} style={{ marginBottom: '1rem' }}>{error}</div>}

        {pendingReviews.length === 0 ? (
            <p>Нет отзывов, ожидающих модерации.</p>
        ) : (
            <div className={styles.reviewsTableContainer}>
                <table className={styles.reviewsTable}>
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Категория</th>
                            <th>Объект</th>
                            <th>Контент (AI)</th>
                            <th>Источник</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingReviews.map(review => (
                            <tr key={review.id}>
                                <td>{new Date(review.created_at).toLocaleDateString('ru-RU')}</td>
                                <td>{review.category}</td>
                                <td>{review.item_name}</td>
                                <td>
                                    {review.generated_content ? (
                                        <details>
                                            <summary>Показать текст...</summary>
                                            <p className={styles.generatedTextPreview}>{review.generated_content}</p>
                                        </details>
                                    ) : (
                                        <em>(Нет текста)</em>
                                    )}
                                </td>
                                <td>
                                    {review.source_file_url ? (
                                        <a href={review.source_file_url} target="_blank" rel="noopener noreferrer" title={review.source_file_url}>Файл</a>
                                    ) : (
                                         <em>(Нет)</em>
                                    )}
                                </td>
                                <td>
                                    <div className={styles.actionButtons}>
                                        <button onClick={() => moderateReview(review.id, 'approved')} className={`${styles.actionButton} ${styles.approveButton}`}>Одобрить</button>
                                        <button onClick={() => moderateReview(review.id, 'rejected')} className={`${styles.actionButton} ${styles.rejectButton}`}>Отклонить</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
         <button onClick={() => router.push('/admin')} className={pageStyles.backButton} style={{ marginTop: '2rem' }}>
             &larr; Назад в Админ панель
         </button>
    </div>
  );
} 