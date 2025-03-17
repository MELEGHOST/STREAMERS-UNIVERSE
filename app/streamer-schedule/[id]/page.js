'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserData, fetchWithTokenRefresh } from '../../utils/twitchAPI';
import styles from './streamer-schedule.module.css';

export default function StreamerSchedulePage({ params }) {
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [streamerData, setStreamerData] = useState(null);
  const [scheduledStreams, setScheduledStreams] = useState([]);
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [selectedStreamId, setSelectedStreamId] = useState(null);
  const [voteFormData, setVoteFormData] = useState({
    preferredDate: '',
    preferredTime: '',
    comment: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Проверяем авторизацию
        if (!isAuthenticated && isInitialized) {
          console.log('Пользователь не авторизован, перенаправление на страницу авторизации');
          router.push('/auth');
          return;
        }
        
        // Загружаем данные пользователя
        const userData = await getUserData();
        
        if (userData && userData.id) {
          setUserData(userData);
          
          // Проверяем, не пытается ли пользователь открыть свое расписание
          if (id === userData.id) {
            router.push('/schedule');
            return;
          }
          
          // Загружаем данные стримера
          const streamerResponse = await fetchWithTokenRefresh(
            `/api/twitch/user?userId=${id}`,
            {
              method: 'GET',
            },
            true, // Использовать кэш
            `streamer_${id}`, // Ключ для кэширования
            3600000 // Время жизни кэша (1 час)
          );
          
          if (streamerResponse) {
            setStreamerData(streamerResponse);
          } else {
            setError('Не удалось загрузить данные стримера');
            setLoading(false);
            return;
          }
          
          // Загружаем запланированные трансляции стримера
          await loadScheduledStreams(id);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    initializePage();
  }, [id, isAuthenticated, isInitialized, router]);

  // Загрузка запланированных трансляций
  const loadScheduledStreams = async (streamerId) => {
    try {
      const data = await fetchWithTokenRefresh(
        `/api/twitch/scheduled-streams?userId=${streamerId}`,
        {
          method: 'GET',
        },
        false // Не использовать кэш
      );
      
      if (data && data.success && data.scheduledStreams) {
        // Сортируем трансляции по дате (ближайшие сначала)
        const sortedStreams = data.scheduledStreams.sort((a, b) => {
          return new Date(a.scheduledDate) - new Date(b.scheduledDate);
        });
        
        // Фильтруем только будущие трансляции
        const futureStreams = sortedStreams.filter(stream => {
          return new Date(stream.scheduledDate) > new Date();
        });
        
        setScheduledStreams(futureStreams);
      } else {
        console.warn('Не удалось загрузить запланированные трансляции:', data?.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error('Ошибка при загрузке запланированных трансляций:', error);
      setError('Не удалось загрузить запланированные трансляции. Пожалуйста, попробуйте позже.');
    }
  };

  // Обработка изменения полей формы голосования
  const handleVoteInputChange = (e) => {
    const { name, value } = e.target;
    setVoteFormData({
      ...voteFormData,
      [name]: value
    });
    
    // Очищаем ошибку для этого поля
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  // Валидация формы голосования
  const validateVoteForm = () => {
    const errors = {};
    
    if (voteFormData.preferredDate && !voteFormData.preferredTime) {
      errors.preferredTime = 'Если указана дата, необходимо указать время';
    }
    
    if (voteFormData.preferredTime && !voteFormData.preferredDate) {
      errors.preferredDate = 'Если указано время, необходимо указать дату';
    }
    
    if (voteFormData.preferredDate) {
      const selectedDate = new Date(`${voteFormData.preferredDate}T${voteFormData.preferredTime || '00:00'}`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.preferredDate = 'Дата не может быть в прошлом';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Обработка отправки формы голосования
  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateVoteForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Объединяем дату и время, если они указаны
      let preferredDate = null;
      if (voteFormData.preferredDate && voteFormData.preferredTime) {
        preferredDate = new Date(`${voteFormData.preferredDate}T${voteFormData.preferredTime}`).toISOString();
      }
      
      // Подготавливаем данные для отправки
      const voteData = {
        streamId: selectedStreamId,
        userId: id, // ID стримера
        voterId: userData.id, // ID голосующего
        voterName: userData.display_name || userData.login,
        preferredDate,
        comment: voteFormData.comment
      };
      
      const response = await fetchWithTokenRefresh(
        `/api/twitch/stream-votes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(voteData)
        },
        false // Не использовать кэш
      );
      
      if (response && response.success) {
        setSuccessMessage('Ваш голос успешно отправлен!');
        // Обновляем список трансляций
        await loadScheduledStreams(id);
        // Сбрасываем форму
        resetVoteForm();
      } else {
        setError(response?.error || 'Не удалось отправить голос');
      }
    } catch (error) {
      console.error('Ошибка при отправке голоса:', error);
      setError('Произошла ошибка при отправке голоса. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Сброс формы голосования
  const resetVoteForm = () => {
    setVoteFormData({
      preferredDate: '',
      preferredTime: '',
      comment: ''
    });
    setSelectedStreamId(null);
    setShowVoteForm(false);
    setFormErrors({});
  };

  // Открытие формы голосования
  const openVoteForm = (streamId) => {
    setSelectedStreamId(streamId);
    setShowVoteForm(true);
    
    // Прокручиваем страницу к форме
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Удаление голоса
  const handleDeleteVote = async (streamId) => {
    if (!confirm('Вы уверены, что хотите удалить свой голос?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetchWithTokenRefresh(
        `/api/twitch/stream-votes?streamId=${streamId}&voterId=${userData.id}`,
        {
          method: 'DELETE'
        },
        false // Не использовать кэш
      );
      
      if (response && response.success) {
        setSuccessMessage('Ваш голос успешно удален!');
        // Обновляем список трансляций
        await loadScheduledStreams(id);
      } else {
        setError(response?.error || 'Не удалось удалить голос');
      }
    } catch (error) {
      console.error('Ошибка при удалении голоса:', error);
      setError('Произошла ошибка при удалении голоса. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Проверка, голосовал ли текущий пользователь за трансляцию
  const hasVoted = (stream) => {
    return stream.votes && stream.votes.some(vote => vote.voterId === userData?.id);
  };

  // Получение голоса текущего пользователя
  const getUserVote = (stream) => {
    if (!stream.votes || !userData) return null;
    return stream.votes.find(vote => vote.voterId === userData.id);
  };

  // Отображение списка трансляций
  const renderScheduledStreams = () => {
    if (scheduledStreams.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>У стримера пока нет запланированных трансляций</p>
          <button 
            className={styles.backButton}
            onClick={() => router.push(`/profile/${id}`)}
          >
            Вернуться в профиль стримера
          </button>
        </div>
      );
    }
    
    return (
      <div className={styles.streamsList}>
        {scheduledStreams.map(stream => {
          const userVote = getUserVote(stream);
          const hasUserVoted = !!userVote;
          
          return (
            <div key={stream._id} className={styles.streamCard}>
              <div className={styles.streamHeader}>
                <h3 className={styles.streamTitle}>{stream.title}</h3>
                <div className={styles.streamActions}>
                  {hasUserVoted ? (
                    <button 
                      className={styles.deleteVoteButton}
                      onClick={() => handleDeleteVote(stream._id)}
                    >
                      Удалить голос
                    </button>
                  ) : (
                    <button 
                      className={styles.voteButton}
                      onClick={() => openVoteForm(stream._id)}
                    >
                      Проголосовать
                    </button>
                  )}
                </div>
              </div>
              
              <div className={styles.streamDetails}>
                <div className={styles.streamInfo}>
                  <p className={styles.streamDate}>
                    <strong>Дата:</strong> {formatDate(stream.scheduledDate)}
                  </p>
                  <p className={styles.streamDuration}>
                    <strong>Длительность:</strong> {stream.duration} минут
                  </p>
                  {stream.category && (
                    <p className={styles.streamCategory}>
                      <strong>Категория:</strong> {stream.category}
                    </p>
                  )}
                  {stream.tags && stream.tags.length > 0 && (
                    <p className={styles.streamTags}>
                      <strong>Теги:</strong> {stream.tags.join(', ')}
                    </p>
                  )}
                </div>
                
                {stream.description && (
                  <div className={styles.streamDescription}>
                    <h4>Описание:</h4>
                    <p>{stream.description}</p>
                  </div>
                )}
                
                {hasUserVoted && (
                  <div className={styles.userVote}>
                    <h4>Ваш голос:</h4>
                    {userVote.preferredDate && (
                      <p className={styles.preferredDate}>
                        <strong>Предпочитаемая дата:</strong> {formatDate(userVote.preferredDate)}
                      </p>
                    )}
                    {userVote.comment && (
                      <p className={styles.voteComment}>
                        <strong>Комментарий:</strong> {userVote.comment}
                      </p>
                    )}
                  </div>
                )}
                
                <div className={styles.votesSection}>
                  <h4>Голоса зрителей ({stream.votes ? stream.votes.length : 0}):</h4>
                  {(!stream.votes || stream.votes.length === 0) ? (
                    <p className={styles.noVotes}>Пока нет голосов</p>
                  ) : (
                    <div className={styles.votesList}>
                      {stream.votes.map((vote, index) => (
                        <div key={index} className={styles.voteItem}>
                          <div className={styles.voterInfo}>
                            <span className={styles.voterName}>{vote.voterName}</span>
                            {vote.preferredDate && (
                              <span className={styles.preferredDate}>
                                Предпочитает: {formatDate(vote.preferredDate)}
                              </span>
                            )}
                          </div>
                          {vote.comment && <p className={styles.voteComment}>{vote.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          Расписание трансляций
          {streamerData && (
            <span className={styles.streamerName}> {streamerData.display_name || streamerData.login}</span>
          )}
        </h1>
        <div className={styles.headerActions}>
          <button 
            className={styles.backButton}
            onClick={() => router.push(`/profile/${id}`)}
          >
            Вернуться в профиль стримера
          </button>
        </div>
      </div>
      
      {error && (
        <div className={styles.errorMessage}>
          <p>{error}</p>
          <button 
            className={styles.closeButton}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className={styles.successMessage}>
          <p>{successMessage}</p>
          <button 
            className={styles.closeButton}
            onClick={() => setSuccessMessage('')}
          >
            ✕
          </button>
        </div>
      )}
      
      {showVoteForm && (
        <div className={styles.formContainer}>
          <h2>Проголосовать за трансляцию</h2>
          <form onSubmit={handleVoteSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="preferredDate">Предпочитаемая дата (необязательно)</label>
                <input
                  type="date"
                  id="preferredDate"
                  name="preferredDate"
                  value={voteFormData.preferredDate}
                  onChange={handleVoteInputChange}
                  className={formErrors.preferredDate ? styles.inputError : ''}
                />
                {formErrors.preferredDate && <p className={styles.errorText}>{formErrors.preferredDate}</p>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="preferredTime">Предпочитаемое время</label>
                <input
                  type="time"
                  id="preferredTime"
                  name="preferredTime"
                  value={voteFormData.preferredTime}
                  onChange={handleVoteInputChange}
                  className={formErrors.preferredTime ? styles.inputError : ''}
                />
                {formErrors.preferredTime && <p className={styles.errorText}>{formErrors.preferredTime}</p>}
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="comment">Комментарий (необязательно)</label>
              <textarea
                id="comment"
                name="comment"
                value={voteFormData.comment}
                onChange={handleVoteInputChange}
                rows="3"
                placeholder="Напишите свои пожелания или комментарии к трансляции"
              />
            </div>
            
            <div className={styles.formActions}>
              <button 
                type="button" 
                className={styles.cancelButton}
                onClick={resetVoteForm}
              >
                Отмена
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Отправка...' : 'Отправить голос'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка данных...</p>
        </div>
      ) : (
        renderScheduledStreams()
      )}
    </div>
  );
} 