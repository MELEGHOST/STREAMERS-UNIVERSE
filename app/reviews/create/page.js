'use client';

import React, { useState } from 'react';
import styles from './create-review.module.css';
import { reviewCategories as categories } from '../categories';

export default function CreateReviewPage() {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    review: '',
    rating: 0,
    age_rating: '',
    image_url: ''
  });
  const [errors, /* setErrors */] = useState({});

  const categoryOptions = Object.keys(categories).map(cat => ({ value: cat, label: cat }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleCategoryChange = (e) => {
    setFormData(prevState => ({
      ...prevState,
      category: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add validation and submission logic
    console.log(formData);
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Создать отзыв</h2>
        
        <div className={styles.formGroup}>
          <label htmlFor="title">Название</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={styles.input}
            placeholder="Например, 'The Witcher 3: Wild Hunt'"
          />
          <p className={styles.error}>{errors.title}</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="category">Категория</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleCategoryChange}
            className={styles.select}
          >
            <option value="" disabled>Выберите категорию</option>
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className={styles.error}>{errors.category}</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="review">Отзыв</label>
          <textarea
            id="review"
            name="review"
            value={formData.review}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Ваши впечатления..."
          />
          <p className={styles.error}>{errors.review}</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="rating">Рейтинг</label>
          <input
            type="number"
            id="rating"
            name="rating"
            min="0"
            max="10"
            step="0.5"
            value={formData.rating}
            onChange={handleChange}
            className={styles.input}
          />
          <p className={styles.error}>{errors.rating}</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="age_rating">Возрастной рейтинг</label>
          <input
            type="text"
            id="age_rating"
            name="age_rating"
            value={formData.age_rating}
            onChange={handleChange}
            className={styles.input}
            placeholder="Например, 18+"
          />
          <p className={styles.error}>{errors.age_rating}</p>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="image_url">URL изображения</label>
          <input
            type="text"
            id="image_url"
            name="image_url"
            value={formData.image_url}
            onChange={handleChange}
            className={styles.input}
            placeholder="https://..."
          />
          <p className={styles.error}>{errors.image_url}</p>
        </div>

        <button type="submit" className={styles.submitButton}>Опубликовать</button>
      </form>
    </div>
  );
} 