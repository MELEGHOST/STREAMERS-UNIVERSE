'use client';

import React, { useState } from 'react';
import styles from './ReviewCategories.module.css';
import ReviewList from './ReviewList';

// Категории отзывов с подкатегориями
export const categories = [
  {
    id: 'hardware',
    name: 'Техника',
    icon: '💻',
    description: 'Компьютеры, ноутбуки, консоли и другое железо',
    color: '#FF3B30',
    count: 42,
    className: styles['category-hardware'],
    subcategories: [
      { id: 'pc', name: 'Компьютеры' },
      { id: 'laptops', name: 'Ноутбуки' },
      { id: 'consoles', name: 'Консоли' },
      { id: 'other_hardware', name: 'Другое железо' }
    ]
  },
  {
    id: 'peripherals',
    name: 'Периферия',
    icon: '🖱️',
    description: 'Клавиатуры, мыши, геймпады и другие устройства',
    color: '#FF9500',
    count: 36,
    className: styles['category-peripherals'],
    subcategories: [
      { id: 'keyboards', name: 'Клавиатуры' },
      { id: 'mouse', name: 'Мыши' },
      { id: 'gamepads', name: 'Геймпады' },
      { id: 'other_peripherals', name: 'Другая периферия' }
    ]
  },
  {
    id: 'furniture',
    name: 'Мебель',
    icon: '🪑',
    description: 'Кресла, столы и другая мебель для стримеров',
    color: '#4CD964',
    count: 28,
    className: styles['category-furniture'],
    subcategories: [
      { id: 'chairs', name: 'Кресла' },
      { id: 'desks', name: 'Столы' },
      { id: 'other_furniture', name: 'Другая мебель' }
    ]
  },
  {
    id: 'lighting',
    name: 'Освещение',
    icon: '💡',
    description: 'Кольцевые лампы, светильники и другие световые приборы',
    color: '#5AC8FA',
    count: 19,
    className: styles['category-lighting'],
    subcategories: [
      { id: 'ring_lights', name: 'Кольцевые лампы' },
      { id: 'lamps', name: 'Светильники' },
      { id: 'other_lighting', name: 'Другое освещение' }
    ]
  },
  {
    id: 'audio',
    name: 'Аудио',
    icon: '🎙️',
    description: 'Микрофоны, наушники, звуковые карты и акустика',
    color: '#007AFF',
    count: 31,
    className: styles['category-audio'],
    subcategories: [
      { id: 'microphones', name: 'Микрофоны' },
      { id: 'headphones', name: 'Наушники' },
      { id: 'sound_cards', name: 'Звуковые карты' },
      { id: 'speakers', name: 'Акустика' }
    ]
  },
  {
    id: 'software',
    name: 'ПО',
    icon: '⚙️',
    description: 'Программы для стриминга, редактирования и другое ПО',
    color: '#5856D6',
    count: 24,
    className: styles['category-software'],
    isNew: true,
    subcategories: [
      { id: 'streaming_software', name: 'ПО для стриминга' },
      { id: 'editing_software', name: 'ПО для редактирования' },
      { id: 'other_software', name: 'Другое ПО' }
    ]
  },
  {
    id: 'games',
    name: 'Игры',
    icon: '🎮',
    description: 'Компьютерные и консольные игры',
    color: '#AF52DE',
    count: 47,
    className: styles['category-games'],
    subcategories: [
      { id: 'pc_games', name: 'Компьютерные игры' },
      { id: 'console_games', name: 'Консольные игры' },
      { id: 'mobile_games', name: 'Мобильные игры' }
    ]
  },
  {
    id: 'merch',
    name: 'Мерч',
    icon: '👕',
    description: 'Одежда, аксессуары и другая атрибутика',
    color: '#FF2D55',
    count: 16,
    className: styles['category-merch'],
    subcategories: [
      { id: 'clothing', name: 'Одежда' },
      { id: 'merch_accessories', name: 'Аксессуары' },
      { id: 'other_merch', name: 'Другая атрибутика' }
    ]
  },
  {
    id: 'services',
    name: 'Сервисы',
    icon: '🔧',
    description: 'Платформы, подписки и онлайн-сервисы',
    color: '#8E8E93',
    count: 22,
    className: styles['category-services'],
    subcategories: [
      { id: 'platforms', name: 'Платформы' },
      { id: 'subscriptions', name: 'Подписки' },
      { id: 'other_services', name: 'Другие сервисы' }
    ]
  },
  {
    id: 'accessories',
    name: 'Аксессуары',
    icon: '🎒',
    description: 'Кабели, переходники, подставки и мелкие аксессуары',
    color: '#34C759',
    count: 33,
    className: styles['category-accessories'],
    subcategories: [
      { id: 'cables', name: 'Кабели и переходники' },
      { id: 'stands', name: 'Подставки' },
      { id: 'other_accessories', name: 'Другие аксессуары' }
    ]
  },
  {
    id: 'cameras',
    name: 'Камеры',
    icon: '📷',
    description: 'Веб-камеры, зеркалки, экшн-камеры и аксессуары',
    color: '#00C7BE',
    count: 27,
    className: styles['category-cameras'],
    subcategories: [
      { id: 'webcams', name: 'Веб-камеры' },
      { id: 'dslr', name: 'Зеркалки' },
      { id: 'action_cameras', name: 'Экшн-камеры' },
      { id: 'camera_accessories', name: 'Аксессуары для камер' }
    ]
  },
  {
    id: 'other',
    name: 'Прочее',
    icon: '🔍',
    description: 'Всё, что не вошло в другие категории',
    color: '#30B0C7',
    count: 15,
    className: styles['category-other'],
    subcategories: [
      { id: 'misc', name: 'Разное' }
    ]
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
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Функция для открытия модального окна с отзывами выбранной категории
  const openCategoryModal = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null); // Сбрасываем выбранную подкатегорию
  };

  // Функция для закрытия модального окна
  const closeModal = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setActiveFilter('all');
  };

  // Функция для выбора подкатегории
  const selectSubcategory = (subcategory) => {
    setSelectedSubcategory(subcategory);
  };

  // Изменение активного фильтра
  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  // Функция для открытия формы написания отзыва
  const handleWriteReview = (subcategory = null) => {
    // Вызываем переданную функцию для открытия модального окна написания отзыва
    // с передачей категории и подкатегории
    if (onWriteReview) {
      onWriteReview({
        category: selectedCategory,
        subcategory: subcategory || selectedSubcategory
      });
      closeModal();
    }
  };

  // Генерация отзывов для демонстрации (в реальном приложении это будут данные с сервера)
  const getReviewsForCategory = (categoryId, subcategoryId = null) => {
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
      
      <button className={styles.addReviewButton} onClick={() => handleWriteReview()}>
        <span className={styles.addReviewIcon}>✏️</span>
        Написать отзыв
      </button>
      
      {/* Модальное окно с подкатегориями выбранной категории */}
      {selectedCategory && (
        <div className={`${styles.modal} ${styles.modalVisible}`}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <span className={styles.modalTitleIcon} style={{ color: selectedCategory.color }}>
                  {selectedCategory.icon}
                </span>
                {selectedCategory.name}
              </h3>
              <button className={styles.closeButton} onClick={closeModal}>×</button>
            </div>
            
            <div className={styles.modalBody}>
              {/* Отображение подкатегорий вместо фильтров */}
              <div className={styles.subcategoriesGrid}>
                {selectedCategory.subcategories.map(subcategory => (
                  <div 
                    key={subcategory.id}
                    className={styles.subcategoryButton}
                    onClick={() => handleWriteReview(subcategory)}
                    style={{ '--category-color': selectedCategory.color }}
                  >
                    {subcategory.name}
                  </div>
                ))}
              </div>
              
              <button 
                className={styles.addReviewButton} 
                onClick={() => handleWriteReview()} 
                style={{ marginTop: '20px' }}
              >
                <span className={styles.addReviewIcon}>✏️</span>
                Написать отзыв
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewCategories; 