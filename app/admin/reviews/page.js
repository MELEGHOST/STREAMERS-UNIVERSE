'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import { checkAdminAccess, isModeratorOrHigher } from '../../utils/adminUtils';
import styles from './page.module.css';

export default function AdminReviewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState({ isAdmin: false, role: null });
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('pending_approval');
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ), 
  []);

  const checkAccess = useCallback(async () => {
    try {
      const access = await checkAdminAccess(supabase);
      setAdminInfo(access);
      if (!access.isAdmin) {
        router.push('/menu');
        return;
      }
      loadReviews(filter);
    } catch(err) {
      console.error("Ошибка проверки доступа:", err);
      setError('Не удалось проверить права доступа.');
      setLoading(false);
    }
  }, [router, filter, supabase]);

  const loadReviews = useCallback(async (status) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('reviews')
        .select(`
          *,
          user:user_id (id, username, display_name),
          approvedBy:approved_by (id, username, display_name)
        `)
        .in('status', status === 'pending_approval' ? ['pending_approval', 'pending'] : [status])
        .order('created_at', { ascending: false });
      
      if (dbError) {
        console.error('Ошибка при загрузке отзывов:', dbError);
        setError('Не удалось загрузить отзывы');
        setReviews([]);
      } else {
        setReviews(data || []);
      }
    } catch (err) {
      console.error('Произошла ошибка при загрузке отзывов:', err);
      setError('Произошла ошибка при загрузке отзывов');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkAccess();
  }, [router, filter, supabase]);

  useEffect(() => {
    if(adminInfo.isAdmin) {
      loadReviews(filter);
    }
  }, [filter, adminInfo.isAdmin, loadReviews]);

  const handleFilterChange = (status) => {
    setFilter(status);
  };

  const updateReviewStatus = async (reviewId, newStatus) => {
    if (!adminInfo.isAdmin || !isModeratorOrHigher(adminInfo.role)) {
      setError('У вас нет прав для этого действия');
      return false;
    }
    
    setActionLoading(prev => ({ ...prev, [reviewId]: true }));
    setError(null);
    
    try {
      let updateData = { status: newStatus };
      
      if (newStatus === 'approved') {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Не удалось получить сессию для подтверждения действия.');
        }
        updateData.approved_by = session.user.id;
        updateData.approved_at = new Date().toISOString();
      }
      
      const { error: updateError } = await supabase
        .from('reviews')
        .update(updateData)
        .eq('id', reviewId);
        
      if (updateError) {
        console.error(`Ошибка при установке статуса ${newStatus}:`, updateError);
        setError(`Не удалось обновить статус отзыва: ${updateError.message}`);
        return false;
      } else {
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        return true;
      }
    } catch (err) {
      console.error(`Произошла ошибка при установке статуса ${newStatus}:`, err);
      setError(`Произошла ошибка: ${err.message}`);
      return false;
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleApproveReview = (reviewId) => {
    updateReviewStatus(reviewId, 'approved');
  };

  const handleRejectReview = (reviewId) => {
    updateReviewStatus(reviewId, 'rejected');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка отзывов...</p>
      </div>
    );
  }

  if (!adminInfo.isAdmin) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Модерация отзывов</h1>
        <div className={styles.role}>Ваша роль: {adminInfo.role}</div>
      </div>
      
      {error && (
        <div className={styles.error}>{error}</div>
      )}
      
      <div className={styles.filters}>
        <button 
          className={`${styles.filterButton} ${filter === 'pending_approval' ? styles.active : ''}`}
          onClick={() => handleFilterChange('pending_approval')}
        >
          Ожидают модерации
        </button>
        <button 
          className={`${styles.filterButton} ${filter === 'approved' ? styles.active : ''}`}
          onClick={() => handleFilterChange('approved')}
        >
          Одобренные
        </button>
        <button 
          className={`${styles.filterButton} ${filter === 'rejected' ? styles.active : ''}`}
          onClick={() => handleFilterChange('rejected')}
        >
          Отклоненные
        </button>
      </div>
      
      {reviews.length === 0 ? (
        <div className={styles.emptyState}>
          {filter === 'pending_approval' ? 'Нет отзывов, ожидающих модерации.' : 
           filter === 'approved' ? 'Нет одобренных отзывов.' : 
           'Нет отклоненных отзывов.'}
        </div>
      ) : (
        <div className={styles.reviewsList}>
          {reviews.map(review => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <h3 className={styles.reviewTitle}>
                  {review.product_name} 
                  {review.rating && (
                    <span className={styles.rating}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <span key={i} className={styles.star}>★</span>
                      ))}
                    </span>
                  )}
                </h3>
                <div className={styles.reviewMeta}>
                  <span>От: {review.author_name}</span>
                  <span>Категория: {review.category || 'Не указана'}</span>
                  <span>Дата: {new Date(review.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
              
              <div className={styles.reviewContent}>
                {review.content ? (
                  <p>{review.content}</p>
                ) : (
                  <p className={styles.reviewPlaceholder}>Содержание отзыва еще обрабатывается...</p>
                )}
              </div>
              
              {review.sources && review.sources.length > 0 && (
                <div className={styles.reviewSources}>
                  <h4>Источники материалов:</h4>
                  <div className={styles.sourcesGrid}>
                    {review.sources.map((source, index) => (
                      <div key={index} className={styles.sourceItem}>
                        {source.includes('jpg') || source.includes('jpeg') || source.includes('png') || source.includes('gif') ? (
                          <Image 
                            src={source} 
                            alt={`Источник ${index + 1}`} 
                            className={styles.sourceImage} 
                            width={100}
                            height={100}
                          />
                        ) : source.includes('mp4') || source.includes('webm') || source.includes('avi') ? (
                          <video src={source} controls className={styles.sourceVideo} />
                        ) : (
                          <a href={source} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                            Источник {index + 1}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(review.status === 'pending_approval' || review.status === 'pending') && (
                <div className={styles.reviewActions}>
                  <button 
                    className={styles.approveButton}
                    onClick={() => handleApproveReview(review.id)}
                    disabled={actionLoading[review.id]}
                  >
                    {actionLoading[review.id] ? 'Одобряем...' : 'Одобрить'}
                  </button>
                  <button 
                    className={styles.rejectButton}
                    onClick={() => handleRejectReview(review.id)}
                    disabled={actionLoading[review.id]}
                  >
                    {actionLoading[review.id] ? '...' : 'Отклонить'}
                  </button>
                </div>
              )}
              
              {review.status === 'approved' && review.approvedBy && (
                <div className={styles.approvalInfo}>
                  <span>Одобрено: {review.approvedBy.display_name || review.approvedBy.username}</span>
                  <span>{new Date(review.approved_at).toLocaleString('ru-RU')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <Link href="/admin" className={styles.backButton}>
        Вернуться в админ-панель
      </Link>
    </div>
  );
} 