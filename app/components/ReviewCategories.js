'use client';

import React, { useState } from 'react';
import styles from './ReviewCategories.module.css';

const categories = [
  { id: 'all', name: 'Все категории', icon: '🔍' },
  { id: 'tech', name: 'Техника', icon: '💻' },
  { id: 'gaming', name: 'Игры', icon: '🎮' },
  { id: 'peripherals', name: 'Периферия', icon: '🎧' },
  { id: 'furniture', name: 'Мебель', icon: '🪑' },
  { id: 'lighting', name: 'Освещение', icon: '💡' },
  { id: 'software', name: 'Программы', icon: '📊' },
  { id: 'accessories', name: 'Аксессуары', icon: '📱' },
  { id: 'food', name: 'Еда и напитки', icon: '🍕' },
  { id: 'clothing', name: 'Одежда', icon: '👕' },
  { id: 'services', name: 'Сервисы', icon: '🔧' },
  { id: 'other', name: 'Прочее', icon: '📦' }
];

const ReviewCategories = ({ onCategorySelect = () => {} }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
    onCategorySelect(categoryId);
    
    // Если на мобильном устройстве, сворачиваем после выбора
    if (window.innerWidth <= 768) {
      setIsExpanded(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Находим выбранную категорию
  const selectedCategoryObj = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className={styles.categoriesContainer}>
      <div className={styles.categoriesHeader} onClick={toggleExpand}>
        <div className={styles.selectedCategory}>
          <span className={styles.categoryIcon}>{selectedCategoryObj?.icon}</span>
          <span className={styles.categoryName}>{selectedCategoryObj?.name}</span>
        </div>
        <span className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
          ▼
        </span>
      </div>
      
      {isExpanded && (
        <div className={styles.categoriesList}>
          {categories.map(category => (
            <div 
              key={category.id}
              className={`${styles.categoryItem} ${selectedCategory === category.id ? styles.active : ''}`}
              onClick={() => handleCategoryClick(category.id)}
            >
              <span className={styles.categoryIcon}>{category.icon}</span>
              <span className={styles.categoryName}>{category.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewCategories; 