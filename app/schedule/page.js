'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { getUserData, fetchWithTokenRefresh } from '../utils/twitchAPI';
import styles from './schedule.module.css';

export default function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [scheduledStreams, setScheduledStreams] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 120,
    category: '',
    tags: ''
  });
  const [editingStreamId, setEditingStreamId] = useState(null);
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
          
          // Загружаем запланированные трансляции
          await loadScheduledStreams(userData.id);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    initializePage();
  }, [isAuthenticated, isInitialized, router]);

  // Загрузка запланированных трансляций
  const loadScheduledStreams = async (userId) => {
    try {
      const data = await fetchWithTokenRefresh(
        `/api/twitch/scheduled-streams?userId=${userId}`,
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
        
        setScheduledStreams(sortedStreams);
      } else {
        console.warn('Не удалось загрузить запланированные трансляции:', data?.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error('Ошибка при загрузке запланированных трансляций:', error);
      setError('Не удалось загрузить запланированные трансляции. Пожалуйста, попробуйте позже.');
    }
  };

  // Обработка изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
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

  // Валидация формы
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Название трансляции обязательно';
    }
    
    if (!formData.scheduledDate) {
      errors.scheduledDate = 'Дата трансляции обязательна';
    } else {
      const selectedDate = new Date(formData.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.scheduledDate = 'Дата трансляции не может быть в прошлом';
      }
    }
    
    if (!formData.scheduledTime) {
      errors.scheduledTime = 'Время трансляции обязательно';
    }
    
    if (!formData.duration || formData.duration <= 0) {
      errors.duration = 'Длительность должна быть положительным числом';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Обработка отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Объединяем дату и время
      const dateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      // Подготавливаем данные для отправки
      const streamData = {
        userId: userData.id,
        title: formData.title,
        description: formData.description,
        scheduledDate: dateTime.toISOString(),
        duration: parseInt(formData.duration),
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      let response;
      
      if (editingStreamId) {
        // Обновляем существующую трансляцию
        response = await fetchWithTokenRefresh(
          `/api/twitch/scheduled-streams`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...streamData,
              streamId: editingStreamId
            })
          },
          false // Не использовать кэш
        );
        
        if (response && response.success) {
          setSuccessMessage('Трансляция успешно обновлена!');
          // Обновляем список трансляций
          await loadScheduledStreams(userData.id);
          // Сбрасываем форму
          resetForm();
        } else {
          setError(response?.error || 'Не удалось обновить трансляцию');
        }
      } else {
        // Создаем новую трансляцию
        response = await fetchWithTokenRefresh(
          `/api/twitch/scheduled-streams`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(streamData)
          },
          false // Не использовать кэш
        );
        
        if (response && response.success) {
          setSuccessMessage('Трансляция успешно запланирована!');
          // Обновляем список трансляций
          await loadScheduledStreams(userData.id);
          // Сбрасываем форму
          resetForm();
        } else {
          setError(response?.error || 'Не удалось запланировать трансляцию');
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении трансляции:', error);
      setError('Произошла ошибка при сохранении трансляции. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Сброс формы
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      scheduledDate: '',
      scheduledTime: '',
      duration: 120,
      category: '',
      tags: ''
    });
    setEditingStreamId(null);
    setShowForm(false);
    setFormErrors({});
  };

  // Редактирование трансляции
  const handleEdit = (stream) => {
    // Преобразуем дату и время
    const date = new Date(stream.scheduledDate);
    const formattedDate = date.toISOString().split('T')[0];
    const formattedTime = date.toTimeString().split(' ')[0].substring(0, 5);
    
    setFormData({
      title: stream.title,
      description: stream.description || '',
      scheduledDate: formattedDate,
      scheduledTime: formattedTime,
      duration: stream.duration || 120,
      category: stream.category || '',
      tags: stream.tags ? stream.tags.join(', ') : ''
    });
    
    setEditingStreamId(stream._id);
    setShowForm(true);
    
    // Прокручиваем страницу к форме
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Удаление трансляции
  const handleDelete = async (streamId) => {
    if (!confirm('Вы уверены, что хотите удалить эту трансляцию?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetchWithTokenRefresh(
        `/api/twitch/scheduled-streams?streamId=${streamId}&userId=${userData.id}`,
        {
          method: 'DELETE'
        },
        false // Не использовать кэш
      );
      
      if (response && response.success) {
        setSuccessMessage('Трансляция успешно удалена!');
        // Обновляем список трансляций
        await loadScheduledStreams(userData.id);
      } else {
        setError(response?.error || 'Не удалось удалить трансляцию');
      }
    } catch (error) {
      console.error('Ошибка при удалении трансляции:', error);
      setError('Произошла ошибка при удалении трансляции. Пожалуйста, попробуйте позже.');
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

  // Отображение голосов
  const renderVotes = (votes) => {
    if (!votes || votes.length === 0) {
      return <p className={styles.noVotes}>Пока нет голосов</p>;
    }
    
    return (
      <div className={styles.votesList}>
        <h4>Голоса зрителей ({votes.length}):</h4>
        <ul>
          {votes.map((vote, index) => (
            <li key={index} className={styles.voteItem}>
              <div className={styles.voterInfo}>
                <span className={styles.voterName}>{vote.voterName}</span>
                {vote.preferredDate && (
                  <span className={styles.preferredDate}>
                    Предпочитает: {formatDate(vote.preferredDate)}
                  </span>
                )}
              </div>
              {vote.comment && <p className={styles.voteComment}>{vote.comment}</p>}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Отображение списка трансляций
  const renderScheduledStreams = () => {
    if (scheduledStreams.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>У вас пока нет запланированных трансляций</p>
          <button 
            className={styles.createButton}
            onClick={() => setShowForm(true)}
          >
            Запланировать трансляцию
          </button>
        </div>
      );
    }
    
    return (
      <div className={styles.streamsList}>
        {scheduledStreams.map(stream => (
          <div key={stream._id} className={styles.streamCard}>
            <div className={styles.streamHeader}>
              <h3 className={styles.streamTitle}>{stream.title}</h3>
              <div className={styles.streamActions}>
                <button 
                  className={styles.editButton}
                  onClick={() => handleEdit(stream)}
                >
                  Редактировать
                </button>
                <button 
                  className={styles.deleteButton}
                  onClick={() => handleDelete(stream._id)}
                >
                  Удалить
                </button>
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
              
              {renderVotes(stream.votes)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Расписание трансляций</h1>
        <div className={styles.headerActions}>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/profile')}
          >
            Вернуться в профиль
          </button>
          {!showForm && (
            <button 
              className={styles.createButton}
              onClick={() => setShowForm(true)}
            >
              Запланировать трансляцию
            </button>
          )}
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
      
      {showForm && (
        <div className={styles.formContainer}>
          <h2>{editingStreamId ? 'Редактировать трансляцию' : 'Запланировать новую трансляцию'}</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Название трансляции*</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={formErrors.title ? styles.inputError : ''}
              />
              {formErrors.title && <p className={styles.errorText}>{formErrors.title}</p>}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="description">Описание</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
              />
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="scheduledDate">Дата*</label>
                <input
                  type="date"
                  id="scheduledDate"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                  className={formErrors.scheduledDate ? styles.inputError : ''}
                />
                {formErrors.scheduledDate && <p className={styles.errorText}>{formErrors.scheduledDate}</p>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="scheduledTime">Время*</label>
                <input
                  type="time"
                  id="scheduledTime"
                  name="scheduledTime"
                  value={formData.scheduledTime}
                  onChange={handleInputChange}
                  className={formErrors.scheduledTime ? styles.inputError : ''}
                />
                {formErrors.scheduledTime && <p className={styles.errorText}>{formErrors.scheduledTime}</p>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="duration">Длительность (мин)*</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="15"
                  max="720"
                  className={formErrors.duration ? styles.inputError : ''}
                />
                {formErrors.duration && <p className={styles.errorText}>{formErrors.duration}</p>}
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="category">Категория</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Например: Just Chatting, Minecraft, и т.д."
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="tags">Теги (через запятую)</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="Например: игры, общение, новости"
              />
            </div>
            
            <div className={styles.formActions}>
              <button 
                type="button" 
                className={styles.cancelButton}
                onClick={resetForm}
              >
                Отмена
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Сохранение...' : (editingStreamId ? 'Сохранить изменения' : 'Запланировать')}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading && !showForm ? (
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