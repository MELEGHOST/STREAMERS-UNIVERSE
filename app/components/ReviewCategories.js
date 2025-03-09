'use client';

import React, { useState } from 'react';
import styles from './ReviewCategories.module.css';
import ReviewList from './ReviewList';

// Категории отзывов
const categories = [
  {
    id: 'hardware',
    name: 'Техника',
    icon: '💻',
    description: 'Компьютеры, ноутбуки, консоли и другое железо',
    color: '#FF3B30',
    count: 42,
    className: styles['category-hardware']
  },
  {
    id: 'peripherals',
    name: 'Периферия',
    icon: '🖱️',
    description: 'Клавиатуры, мыши, геймпады и другие устройства',
    color: '#FF9500',
    count: 36,
    className: styles['category-peripherals']
  },
  {
    id: 'furniture',
    name: 'Мебель',
    icon: '🪑',
    description: 'Кресла, столы и другая мебель для стримеров',
    color: '#4CD964',
    count: 28,
    className: styles['category-furniture']
  },
  {
    id: 'lighting',
    name: 'Освещение',
    icon: '💡',
    description: 'Кольцевые лампы, светильники и другие световые приборы',
    color: '#5AC8FA',
    count: 19,
    className: styles['category-lighting']
  },
  {
    id: 'audio',
    name: 'Аудио',
    icon: '🎙️',
    description: 'Микрофоны, наушники, звуковые карты и акустика',
    color: '#007AFF',
    count: 31,
    className: styles['category-audio']
  },
  {
    id: 'software',
    name: 'ПО',
    icon: '⚙️',
    description: 'Программы для стриминга, редактирования и другое ПО',
    color: '#5856D6',
    count: 24,
    className: styles['category-software'],
    isNew: true
  },
  {
    id: 'games',
    name: 'Игры',
    icon: '🎮',
    description: 'Компьютерные и консольные игры',
    color: '#AF52DE',
    count: 47,
    className: styles['category-games']
  },
  {
    id: 'merch',
    name: 'Мерч',
    icon: '👕',
    description: 'Одежда, аксессуары и другая атрибутика',
    color: '#FF2D55',
    count: 16,
    className: styles['category-merch']
  },
  {
    id: 'services',
    name: 'Сервисы',
    icon: '🔧',
    description: 'Платформы, подписки и онлайн-сервисы',
    color: '#8E8E93',
    count: 22,
    className: styles['category-services']
  },
  {
    id: 'accessories',
    name: 'Аксессуары',
    icon: '🎒',
    description: 'Кабели, переходники, подставки и мелкие аксессуары',
    color: '#34C759',
    count: 33,
    className: styles['category-accessories']
  },
  {
    id: 'cameras',
    name: 'Камеры',
    icon: '📷',
    description: 'Веб-камеры, зеркалки, экшн-камеры и аксессуары',
    color: '#00C7BE',
    count: 27,
    className: styles['category-cameras']
  },
  {
    id: 'other',
    name: 'Прочее',
    icon: '🔍',
    description: 'Всё, что не вошло в другие категории',
    color: '#30B0C7',
    count: 15,
    className: styles['category-other']
  }
];

// Фильтры для отзывов
const filters = [
  { id: 'all', name: 'Все отзывы' },
  { id: 'popular', name: 'Популярные' },
  { id: 'recent', name: 'Недавние' },
  { id: 'highest', name: 'Высокий рейтинг' },
  { id: 'lowest', name: 'Низкий рейтинг' }
];

const ReviewCategories = ({ onWriteReview }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Функция для открытия модального окна с отзывами выбранной категории
  const openCategoryModal = (category) => {
    setSelectedCategory(category);
  };

  // Функция для закрытия модального окна
  const closeModal = () => {
    setSelectedCategory(null);
    setActiveFilter('all');
  };

  // Изменение активного фильтра
  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  // Функция для открытия формы написания отзыва
  const handleWriteReview = () => {
    // Закрываем текущее модальное окно, если оно открыто
    if (selectedCategory) {
      closeModal();
    }
    
    // Вызываем переданную функцию для открытия модального окна написания отзыва
    if (onWriteReview) {
      onWriteReview();
    }
  };

  // Генерация отзывов для демонстрации (в реальном приложении это будут данные с сервера)
  const getReviewsForCategory = (categoryId) => {
    // Здесь будет логика получения реальных отзывов с сервера
    // Пока возвращаем пустой массив для демонстрации
    return [];
  };

  return (
    <div className={styles.categoriesContainer}>
      <h2 className={styles.categoriesTitle}>Категории отзывов</h2>
      
      <div className={styles.categoriesGrid}>
        {categories.map((category) => (
          <div 
            key={category.id}
            className={`${styles.categoryCard} ${category.className}`}
            onClick={() => openCategoryModal(category)}
            style={{ '--category-color': category.color }}
          >
            <div className={styles.categoryIcon}>{category.icon}</div>
            <div className={styles.categoryName}>{category.name}</div>
            <div className={styles.categoryDescription}>{category.description}</div>
            <div className={styles.categoryCount}>{category.count}</div>
            {category.isNew && (
              <div className={styles.categoryBadge}>Новое</div>
            )}
          </div>
        ))}
      </div>
      
      <button className={styles.addReviewButton} onClick={handleWriteReview}>
        <span className={styles.addReviewIcon}>✏️</span>
        Написать отзыв
      </button>
      
      {/* Модальное окно с отзывами выбранной категории */}
      <div className={`${styles.modal} ${selectedCategory ? styles.modalVisible : ''}`}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>
              <span className={styles.modalTitleIcon} style={{ color: selectedCategory?.color }}>
                {selectedCategory?.icon}
              </span>
              {selectedCategory?.name}
            </h3>
            <button className={styles.closeButton} onClick={closeModal}>×</button>
          </div>
          
          <div className={styles.modalBody}>
            <div className={styles.filterContainer}>
              {filters.map(filter => (
                <button
                  key={filter.id}
                  className={`${styles.filterButton} ${activeFilter === filter.id ? styles.filterButtonActive : ''}`}
                  style={activeFilter === filter.id ? { '--category-color': selectedCategory?.color } : {}}
                  onClick={() => handleFilterChange(filter.id)}
                >
                  {filter.name}
                </button>
              ))}
            </div>
            
            {/* Список отзывов */}
            {getReviewsForCategory(selectedCategory?.id).length > 0 ? (
              <ReviewList 
                reviews={getReviewsForCategory(selectedCategory?.id)} 
                filter={activeFilter}
              />
            ) : (
              <div className={styles.noReviews}>
                <p>В этой категории пока нет отзывов. Будьте первым!</p>
                <button className={styles.addReviewButton} onClick={handleWriteReview} style={{ marginTop: '20px' }}>
                  <span className={styles.addReviewIcon}>✏️</span>
                  Написать отзыв
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewCategories; 