"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Select from 'react-select';
import { useAuth } from '../../contexts/AuthContext';
import { categories, movieGenres } from '../categories';
import styles from './create-review.module.css';

// Стили для react-select, чтобы они соответствовали теме
const reactSelectStyles = (themeParams) => ({
  control: (provided) => ({
    ...provided,
    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
    borderColor: 'var(--tg-theme-hint-color)',
    borderRadius: '8px',
    minHeight: '48px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'var(--tg-theme-button-color)',
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 15px',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--tg-theme-hint-color)',
    margin: 0,
    padding: 0,
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--tg-theme-text-color)',
    margin: 0,
    padding: 0,
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--tg-theme-text-color)',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
    border: '1px solid var(--tg-theme-hint-color)',
    borderRadius: '8px',
    zIndex: 10,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused
      ? 'var(--tg-theme-button-color)'
      : state.isSelected
      ? 'var(--tg-theme-accent-text-color)'
      : 'var(--tg-theme-secondary-bg-color)',
    color: state.isFocused || state.isSelected
      ? 'var(--tg-theme-button-text-color)'
      : 'var(--tg-theme-text-color)',
    cursor: 'pointer',
    '&:active': {
        backgroundColor: 'var(--tg-theme-accent-text-color)',
    }
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'var(--tg-theme-accent-text-color)',
    borderRadius: '4px',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: 'var(--tg-theme-button-text-color)',
    padding: '2px 6px',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: 'var(--tg-theme-button-text-color)',
    cursor: 'pointer',
    borderRadius: '0 4px 4px 0',
    '&:hover': {
      backgroundColor: 'var(--tg-theme-destructive-text-color)',
      color: 'white',
    },
  }),
});

export default function CreateReviewPage() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const router = useRouter();
    const { user, isLoading: authLoading, isAuthenticated, currentTheme } = useAuth();

    const themeParams = useMemo(() => {
        const isDark = currentTheme === 'dark';
        return {
            bg_color: isDark ? '#1a1a1a' : '#ffffff',
            text_color: isDark ? '#ffffff' : '#000000',
            hint_color: isDark ? '#aaaaaa' : '#777777',
            link_color: isDark ? '#8774e1' : '#007bff',
            button_color: isDark ? '#8774e1' : '#007bff',
            button_text_color: '#ffffff',
            secondary_bg_color: isDark ? '#2c2c2c' : '#f8f9fa',
            destructive_text_color: isDark ? '#ff6b6b' : '#dc3545',
            'button-rgb': isDark ? '135, 116, 225' : '0, 123, 255',
            'destructive-rgb': isDark ? '255, 107, 107' : '220, 53, 69',
            'accent-text-color': isDark ? '#624fad' : '#0056b3',
        };
    }, [currentTheme]);

    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [ageRating, setAgeRating] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const isMovieOrSeries = category === 'Фильмы' || category === 'Сериалы';

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            console.log("Пользователь не авторизован, редирект или сообщение");
        }
    }, [authLoading, isAuthenticated, router]);

    const handleRating = (rate) => {
        setRating(rate);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
            setImageUrl('');
        }
    };

    const handleImageUrlChange = (e) => {
        const url = e.target.value;
        setImageUrl(url);
        if (url) {
            setImagePreview(url);
            setImageFile(null);
        } else {
            setImagePreview(null);
        }
    };

    const handleAiFill = async () => {
        if (!title) {
            setError('Для автозаполнения нужно ввести название.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        setSuccessMessage('Магия ИИ в процессе...');

        try {
            const response = await fetch('/api/reviews/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, category }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка генерации отзыва ИИ');
            }

            const data = await response.json();

            if (data.text) setText(data.text);
            if (data.rating) setRating(parseInt(data.rating, 10) || 0);
            if (data.age_rating) setAgeRating(data.age_rating);
            if (data.image_url) {
                setImageUrl(data.image_url);
                setImagePreview(data.image_url);
                setImageFile(null);
            }
            if (isMovieOrSeries && data.genres && Array.isArray(data.genres)) {
                const genreOptions = data.genres
                    .map(genre => genre.trim())
                    .filter(genre => movieGenres.some(g => g.value === genre))
                    .map(genre => ({ value: genre, label: genre }));
                setSelectedGenres(genreOptions);
            } else if (!isMovieOrSeries && data.subcategory) {
                setSubcategory(data.subcategory);
            }

            setSuccessMessage('Поля заполнены с помощью ИИ!');
            setTimeout(() => setSuccessMessage(''), 3000);

        } catch (err) {
            console.error('Ошибка при вызове API генерации:', err);
            setError(`Ошибка ИИ: ${err.message}`);
            setSuccessMessage('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!user) {
            setError('Необходимо авторизоваться для создания отзыва.');
            return;
        }
        if (!category || !title || !text || rating === 0) {
            setError('Пожалуйста, заполните все обязательные поля (Категория, Название, Текст, Рейтинг).');
            return;
        }
        if (isMovieOrSeries && selectedGenres.length === 0) {
            setError('Пожалуйста, выберите хотя бы один жанр для фильмов или сериалов.');
            return;
        }
        if (!isMovieOrSeries && !subcategory) {
            setError('Пожалуйста, укажите подкатегорию.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');

        let uploadedImageUrl = imageUrl;

        if (imageFile) {
            const filePath = `reviews/${user.id}/${Date.now()}_${imageFile.name}`;
            try {
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    console.error('Ошибка Supabase Storage Upload:', uploadError);
                    if (uploadError.message.includes('Bucket not found')) {
                         setError('Ошибка: Хранилище изображений (bucket \'images\') не найдено. Обратитесь к администратору.');
                    } else if (uploadError.message.includes('exceeds the maximum allowed size')) {
                         setError('Ошибка: Файл изображения слишком большой.');
                    } else if (uploadError.message.includes('policy')) {
                        setError('Ошибка: Недостаточно прав для загрузки изображения. Проверьте политики RLS для бакета \'images\'.');
                    } else {
                         setError(`Не удалось загрузить изображение: ${uploadError.message}`);
                    }
                    setIsSubmitting(false);
                    return;
                }

                const { data: publicUrlData, error: urlError } = supabase.storage
                    .from('images')
                    .getPublicUrl(filePath);

                if (urlError) {
                    console.error("Ошибка получения public URL:", urlError);
                    setError('Изображение загружено, но не удалось получить публичную ссылку. Отзыв будет без картинки.');
                    uploadedImageUrl = null;
                } else {
                    uploadedImageUrl = publicUrlData.publicUrl;
                    setImageUrl(uploadedImageUrl);
                    console.log("Изображение загружено, URL:", uploadedImageUrl);
                }

            } catch (uploadError) {
                console.error('Непредвиденная ошибка загрузки изображения:', uploadError);
                setError(`Не удалось загрузить изображение: ${uploadError.message}`);
                setIsSubmitting(false);
                return;
            }
        }

        const reviewData = {
            author_id: user.id,
            category,
            title,
            text,
            rating,
            image_url: uploadedImageUrl,
            age_rating: ageRating || null,
            ...(isMovieOrSeries
                ? { genres: selectedGenres.map(g => g.value) }
                : { subcategory: subcategory })
        };

        try {
            const { data, error: dbError } = await supabase
                .from('reviews')
                .insert(reviewData)
                .select();

            if (dbError) {
                throw dbError;
            }

            setSuccessMessage('Отзыв успешно создан!');
            setCategory('');
            setSubcategory('');
            setSelectedGenres([]);
            setTitle('');
            setText('');
            setRating(0);
            setAgeRating('');
            setImageUrl('');
            setImageFile(null);
            setImagePreview(null);

            setTimeout(() => {
                setSuccessMessage('');
                router.push('/menu');
            }, 2000);

        } catch (dbError) {
            console.error('Ошибка сохранения отзыва:', dbError);
            setError(`Не удалось сохранить отзыв: ${dbError.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }, [user, category, title, text, rating, subcategory, selectedGenres, ageRating, imageUrl, imageFile, isMovieOrSeries, supabase, router, currentTheme]);

    const genreOptions = movieGenres.map(genre => ({ value: genre, label: genre }));

    const selectStyles = reactSelectStyles(themeParams);

    return (
        <div className={styles.container} style={{ backgroundColor: themeParams.bg_color, color: themeParams.text_color }}>
            {error && <p className={styles.errorMessage}>{error}</p>}
            {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                <div className={styles.formGroup}>
                    <label htmlFor="category" className={styles.label}>Категория *</label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setSubcategory('');
                            setSelectedGenres([]);
                        }}
                        className={styles.selectInput}
                        required
                        disabled={isSubmitting || authLoading}
                    >
                        <option value="">Выберите категорию</option>
                        {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                {isMovieOrSeries ? (
                    <div className={styles.formGroup}>
                        <label htmlFor="genres" className={styles.label}>Жанры *</label>
                        <Select
                            id="genres"
                            isMulti
                            options={genreOptions}
                            value={selectedGenres}
                            onChange={setSelectedGenres}
                            placeholder="Выберите жанры..."
                            className={`${styles.reactSelectContainer} react-select-container`}
                            styles={selectStyles}
                            required
                            isDisabled={isSubmitting || authLoading}
                        />
                    </div>
                ) : category ? (
                    <div className={styles.formGroup}>
                        <label htmlFor="subcategory" className={styles.label}>Подкатегория *</label>
                        <input
                            type="text"
                            id="subcategory"
                            value={subcategory}
                            onChange={(e) => setSubcategory(e.target.value)}
                            className={styles.inputField}
                            placeholder="Например, RPG, Шутер, Поп-музыка..."
                            required
                            disabled={isSubmitting || authLoading}
                        />
                    </div>
                ) : null}

                <div className={styles.formGroup}>
                    <label htmlFor="title" className={styles.label}>Название *</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={styles.inputField}
                        placeholder="Название фильма, игры, книги..."
                        required
                        disabled={isSubmitting || authLoading}
                    />
                </div>

                {category && title && (
                    <div className={styles.aiButtonGroup}>
                         <button
                            type="button"
                            onClick={handleAiFill}
                            disabled={isSubmitting || !title || authLoading}
                            className={`${styles.aiButton} ${styles.submitButton}`}
                        >
                            {isSubmitting && successMessage.includes('Магия') ? '✨ Думаю...' : '🪄 Заполнить с помощью ИИ'}
                        </button>
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label htmlFor="text" className={styles.label}>Текст отзыва *</label>
                    <textarea
                        id="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className={styles.textareaField}
                        placeholder="Ваши впечатления..."
                        required
                        disabled={isSubmitting || authLoading}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Рейтинг *</label>
                    <div className={styles.ratingContainer}>
                        {[...Array(5)].map((_, index) => {
                            const ratingValue = index + 1;
                            return (
                                <span
                                    key={ratingValue}
                                    className={`${styles.star} ${ratingValue <= (hoverRating || rating) ? styles.filled : ''}`}
                                    onClick={() => handleRating(ratingValue)}
                                    onMouseEnter={() => setHoverRating(ratingValue)}
                                    onMouseLeave={() => setHoverRating(0)}
                                >
                                    ★
                                </span>
                            );
                        })}
                        {rating > 0 && <span className={styles.ratingValue}>{rating}/5</span>}
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="ageRating" className={styles.label}>Возрастной рейтинг</label>
                    <input
                        type="text"
                        id="ageRating"
                        value={ageRating}
                        onChange={(e) => setAgeRating(e.target.value)}
                        className={styles.inputField}
                        placeholder="Например, 18+, PG-13, 0+"
                        disabled={isSubmitting || authLoading}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="imageUrl" className={styles.label}>URL изображения</label>
                    <input
                        type="url"
                        id="imageUrl"
                        value={imageUrl}
                        onChange={handleImageUrlChange}
                        className={styles.inputField}
                        placeholder="https://example.com/image.jpg"
                        disabled={isSubmitting || authLoading}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="imageFile" className={styles.label}>Или загрузите файл</label>
                    <input
                        type="file"
                        id="imageFile"
                        accept="image/*"
                        onChange={handleImageChange}
                        className={styles.fileInput}
                        disabled={isSubmitting || authLoading}
                    />
                     {imagePreview && (
                        <div className={styles.imagePreviewContainer}>
                            <img src={imagePreview} alt="Предпросмотр" className={styles.imagePreview} />
                        </div>
                    )}
                </div>

                <div className={styles.buttonGroup}>
                   <button
                       type="button"
                       onClick={() => router.push('/menu')}
                       className={`${styles.submitButton} ${styles.secondaryButton}`}
                       disabled={isSubmitting || authLoading}
                   >
                        Назад в меню
                    </button>
                   <button
                       type="button"
                       onClick={handleSubmit}
                       className={styles.submitButton}
                       disabled={isSubmitting || authLoading || !category || !title || !text || rating === 0 || (isMovieOrSeries && selectedGenres.length === 0) || (!isMovieOrSeries && !subcategory)}
                   >
                        {isSubmitting ? 'Публикация...' : 'Опубликовать'}
                    </button>
                </div>

            </form>
        </div>
    );
} 