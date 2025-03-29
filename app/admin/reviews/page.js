'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import supabase from '../../../lib/supabase';
import { checkAdminAccess, isModeratorOrHigher } from '../../utils/adminUtils';
import { DataStorage } from '../../utils/dataStorage';
import styles from './page.module.css';

export default function AdminReviewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState({ isAdmin: false, role: null });
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState(null);

  // Проверка прав администратора
  useEffect(() => {
    const checkAccess = async () => {
      const access = await checkAdminAccess();
      setAdminInfo(access);
      
      if (!access.isAdmin) {
        router.push('/menu');
        return;
      }
      
      loadReviews(filter);
    };
    
    checkAccess();
  }, [router, filter]);

  // Загрузка отзывов из Supabase
  const loadReviews = async (status) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user:user_id (id, username, displayName),
          approvedBy:approved_by (id, username, displayName)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Ошибка при загрузке отзывов:', error);
        setError('Не удалось загрузить отзывы');
      } else {
        setReviews(data || []);
      }
    } catch (err) {
      console.error('Произошла ошибка при загрузке отзывов:', err);
      setError('Произошла ошибка при загрузке отзывов');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик изменения фильтра
  const handleFilterChange = (status) => {
    setFilter(status);
    loadReviews(status);
  };

  // Обработчик одобрения отзыва
  const handleApproveReview = async (reviewId) => {
    if (!adminInfo.isAdmin || !isModeratorOrHigher(adminInfo.role)) {
      setError('У вас нет прав для одобрения отзывов');
      return;
    }
    
    try {
      // Используем DataStorage вместо прямого обращения к localStorage
      const userData = await DataStorage.getData('user');
      
      if (!userData || !userData.id) {
        setError('Не удалось получить данные пользователя');
        return;
      }
      
      const { error } = await supabase
        .from('reviews')
        .update({
          status: 'approved',
          approved_by: userData.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', reviewId);
      
      if (error) {
        console.error('Ошибка при одобрении отзыва:', error);
        setError('Не удалось одобрить отзыв');
      } else {
        // Обновляем список отзывов
        loadReviews(filter);
      }
    } catch (err) {
      console.error('Произошла ошибка при одобрении отзыва:', err);
      setError('Произошла ошибка при одобрении отзыва');
    }
  };

  // Обработчик отклонения отзыва
  const handleRejectReview = async (reviewId) => {
    if (!adminInfo.isAdmin || !isModeratorOrHigher(adminInfo.role)) {
      setError('У вас нет прав для отклонения отзывов');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          status: 'rejected'
        })
        .eq('id', reviewId);
      
      if (error) {
        console.error('Ошибка при отклонении отзыва:', error);
        setError('Не удалось отклонить отзыв');
      } else {
        // Обновляем список отзывов
        loadReviews(filter);
      }
    } catch (err) {
      console.error('Произошла ошибка при отклонении отзыва:', err);
      setError('Произошла ошибка при отклонении отзыва');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка отзывов...</p>
      </div>
    );
  }

  // Если нет прав администратора, отображаем пустой компонент (произойдет редирект)
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
          className={`${styles.filterButton} ${filter === 'pending' ? styles.active : ''}`}
          onClick={() => handleFilterChange('pending')}
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
          {filter === 'pending' ? 'Нет отзывов, ожидающих модерации.' : 
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
              
              {filter === 'pending' && isModeratorOrHigher(adminInfo.role) && (
                <div className={styles.reviewActions}>
                  <button 
                    className={styles.approveButton}
                    onClick={() => handleApproveReview(review.id)}
                  >
                    Одобрить
                  </button>
                  <button 
                    className={styles.rejectButton}
                    onClick={() => handleRejectReview(review.id)}
                  >
                    Отклонить
                  </button>
                </div>
              )}
              
              {filter === 'approved' && (
                <div className={styles.approvalInfo}>
                  <span>Одобрен: {new Date(review.approved_at).toLocaleDateString('ru-RU')}</span>
                  <span>Модератор: {review.approvedBy?.displayName || review.approvedBy?.username || 'Неизвестно'}</span>
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