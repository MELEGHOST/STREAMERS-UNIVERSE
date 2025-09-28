'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './create-review.module.css';
import { reviewCategories as categories } from '../categories';
import { useTranslation } from 'react-i18next';

export default function CreateReviewPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    review: '',
    rating: 0,
    age_rating: '',
    image_url: '',
  });
  const [errors, setErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  const categoryOptions = Object.keys(categories).map((cat) => ({
    value: cat,
    label: cat,
  }));

  const handleGenerate = async () => {
    if (!formData.title) {
      setErrors((prev) => ({
        ...prev,
        title: t('create_review.form.titleError'),
      }));
      return;
    }
    setIsGenerating(true);
    setErrors({});
    try {
      const response = await fetch('/api/reviews/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formData.title }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate review');
      }
      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        category: data.category || prev.category,
        review: data.review || prev.review,
        rating: data.rating || prev.rating,
        age_rating: data.age_rating || prev.age_rating,
      }));
    } catch (error) {
      console.error(error);
      setErrors((prev) => ({
        ...prev,
        general: t('create_review.generateError'),
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleCategoryChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      category: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add validation and submission logic
    console.log(formData);
  };

  return (
    <div className={styles.container}>
      <button onClick={() => router.back()} className={styles.backButton}>
        &larr; {t('create_review.back')}
      </button>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>{t('create_review.title')}</h2>

        <div className={styles.formGroup}>
          <label htmlFor="title">{t('create_review.form.titleLabel')}</label>
          <div className={styles.titleContainer}>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={styles.input}
              placeholder={t('create_review.form.titlePlaceholder')}
            />
            <button
              type="button"
              onClick={handleGenerate}
              className={styles.generateButton}
              disabled={isGenerating || !formData.title}
            >
              {isGenerating
                ? t('create_review.generatingButton')
                : t('create_review.generateButton')}
            </button>
          </div>
          <p className={styles.error}>{errors.title}</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="category">
            {t('create_review.form.categoryLabel')}
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleCategoryChange}
            className={styles.select}
          >
            <option value="" disabled>
              {t('create_review.form.categoryPlaceholder')}
            </option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className={styles.error}>{errors.category}</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="review">{t('create_review.form.reviewLabel')}</label>
          <textarea
            id="review"
            name="review"
            value={formData.review}
            onChange={handleChange}
            className={styles.textarea}
            placeholder={t('create_review.form.reviewPlaceholder')}
          />
          <p className={styles.error}>{errors.review}</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="rating">{t('create_review.form.ratingLabel')}</label>
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
          <label htmlFor="age_rating">
            {t('create_review.form.ageRatingLabel')}
          </label>
          <input
            type="text"
            id="age_rating"
            name="age_rating"
            value={formData.age_rating}
            onChange={handleChange}
            className={styles.input}
            placeholder={t('create_review.form.ageRatingPlaceholder')}
          />
          <p className={styles.error}>{errors.age_rating}</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="image_url">
            {t('create_review.form.imageUrlLabel')}
          </label>
          <input
            type="text"
            id="image_url"
            name="image_url"
            value={formData.image_url}
            onChange={handleChange}
            className={styles.input}
            placeholder={t('create_review.form.imageUrlPlaceholder')}
          />
          <p className={styles.error}>{errors.image_url}</p>
        </div>

        <button type="submit" className={styles.submitButton}>
          {t('create_review.submitButton')}
        </button>
        {errors.general && (
          <p className={`${styles.error} ${styles.generalError}`}>
            {errors.general}
          </p>
        )}
      </form>
    </div>
  );
}
