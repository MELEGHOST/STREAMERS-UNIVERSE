"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Select from 'react-select';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { reviewCategories, movieGenres } from '../categories';
import styles from './create-review.module.css';

// Стили для react-select, чтобы они соответствовали теме
const reactSelectStyles = (isDark) => ({
  control: (provided) => ({
    ...provided,
    backgroundColor: isDark ? '#2c2c2c' : '#f8f9fa',
    borderColor: isDark ? '#aaaaaa' : '#777777',
    borderRadius: '8px',
    minHeight: '48px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: isDark ? '#8774e1' : '#007bff',
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 15px',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: isDark ? '#aaaaaa' : '#777777',
    margin: 0,
    padding: 0,
  }),
  input: (provided) => ({
    ...provided,
    color: isDark ? '#ffffff' : '#000000',
    margin: 0,
    padding: 0,
  }),
  singleValue: (provided) => ({
    ...provided,
    color: isDark ? '#ffffff' : '#000000',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: isDark ? '#2c2c2c' : '#f8f9fa',
    border: `1px solid ${isDark ? '#aaaaaa' : '#777777'}`,
    borderRadius: '8px',
    zIndex: 10,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused
      ? (isDark ? '#8774e1' : '#007bff')
      : state.isSelected
      ? (isDark ? '#624fad' : '#0056b3')
      : (isDark ? '#2c2c2c' : '#f8f9fa'),
    color: state.isFocused || state.isSelected
      ? '#ffffff'
      : (isDark ? '#ffffff' : '#000000'),
    cursor: 'pointer',
    '&:active': {
        backgroundColor: isDark ? '#624fad' : '#0056b3',
    }
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: isDark ? '#624fad' : '#0056b3',
    borderRadius: '4px',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#ffffff',
    padding: '2px 6px',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#ffffff',
    cursor: 'pointer',
    borderRadius: '0 4px 4px 0',
    '&:hover': {
      backgroundColor: isDark ? '#ff6b6b' : '#dc3545',
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
    const { user, isLoading: authLoading, isAuthenticated, currentTheme, supabase: authSupabase } = useAuth();

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

    const [authorTwitchNickname, setAuthorTwitchNickname] = useState('');
    const [sourceFile, setSourceFile] = useState(null);
    const [sourceUrl, setSourceUrl] = useState('');
    const [isUploadingSource, setIsUploadingSource] = useState(false);
    const [isGeneratingFull, setIsGeneratingFull] = useState(false);
    const [aiFullError, setAiFullError] = useState('');
    const [aiFullSuccessMessage, setAiFullSuccessMessage] = useState('');

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

    const handleSourceFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const allowedTypes = ['text/plain', 'audio/', 'video/'];
            if (!allowedTypes.some(type => file.type.startsWith(type))) {
                setAiFullError(`Неподдерживаемый тип файла: ${file.type}. Разрешены .txt, аудио и видео.`);
                setSourceFile(null);
                event.target.value = null;
                return;
            }
            const maxSize = 50 * 1024 * 1024;
            if (file.size > maxSize) {
                 setAiFullError(`Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} MB). Макс. размер: 50 MB.`);
                 setSourceFile(null);
                 event.target.value = null;
                 return;
            }
            setSourceFile(file);
            setSourceUrl('');
            setAiFullError('');
        } else {
            setSourceFile(null);
        }
    };

    const handleSourceUrlChange = (event) => {
        const url = event.target.value;
        setSourceUrl(url);
        if (url) {
            setSourceFile(null);
            const fileInput = document.getElementById('sourceFileInput');
            if (fileInput) fileInput.value = '';
        }
         setAiFullError('');
    };

    const handleAiFullSubmit = useCallback(async () => {
        if (!isAuthenticated || !authSupabase) {
            setAiFullError('Необходимо авторизоваться для генерации отзыва.');
            return;
        }
        if (!authorTwitchNickname) {
            setAiFullError('Укажите Twitch Никнейм автора контента.');
            return;
        }
        if (!sourceFile && !sourceUrl) {
            setAiFullError('Выберите файл ИЛИ укажите URL для генерации.');
            return;
        }
        if (sourceFile && sourceUrl) {
            setAiFullError('Используйте что-то одно: файл или URL.');
            return;
        }

        setIsUploadingSource(!!sourceFile);
        setIsGeneratingFull(true);
        setAiFullError('');
        setAiFullSuccessMessage('');

        let sourceFilePath = null;
        let uploadErrorOccurred = false;

        try {
            if (sourceFile) {
                console.log('[handleAiFullSubmit] Загрузка файла источника...');
                const filePath = `reviews-sources/${user.id}/${Date.now()}_${sourceFile.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('reviews-sources')
                    .upload(filePath, sourceFile);

                if (uploadError) {
                    uploadErrorOccurred = true;
                    throw new Error(`Ошибка загрузки файла источника: ${uploadError.message}`);
                }
                sourceFilePath = filePath;
                console.log('[handleAiFullSubmit] Файл источника загружен:', sourceFilePath);
                setIsUploadingSource(false);
            }

            const session = await authSupabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) {
                throw new Error('Не удалось получить токен авторизации.');
            }

            setAiFullSuccessMessage('🤖 AI генерирует отзыв...');
            const response = await fetch('/api/reviews/generate-full', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    sourcePath: sourceFilePath,
                    sourceUrl: sourceUrl,
                    authorTwitchName: authorTwitchNickname,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Ошибка генерации отзыва (HTTP ${response.status})`);
            }

            setAiFullSuccessMessage(result.message || 'Отзыв успешно сгенерирован и отправлен на модерацию!');
            setAuthorTwitchNickname('');
            setSourceFile(null);
            setSourceUrl('');
            const fileInput = document.getElementById('sourceFileInput');
            if (fileInput) fileInput.value = '';
            setTimeout(() => setAiFullSuccessMessage(''), 5000);

        } catch (err) {
            console.error('Ошибка полной генерации AI:', err);
            setAiFullError(err.message || 'Произошла неизвестная ошибка.');
            setAiFullSuccessMessage('');
            if (!uploadErrorOccurred) {
                 setIsUploadingSource(false);
            }
        } finally {
             setIsGeneratingFull(false);
             if (!uploadErrorOccurred) setIsUploadingSource(false);
        }
    }, [isAuthenticated, authSupabase, user, authorTwitchNickname, sourceFile, sourceUrl, supabase.storage]);

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
                const { error: uploadError } = await supabase.storage
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
            const { error: dbError } = await supabase
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
    }, [user, category, title, text, rating, subcategory, selectedGenres, ageRating, imageUrl, imageFile, isMovieOrSeries, supabase, router]);

    const categoryOptions = Object.keys(reviewCategories).map(cat => ({ value: cat, label: cat }));
    const genreOptions = movieGenres.map(genre => ({ value: genre, label: genre }));
    const selectStyles = useMemo(() => reactSelectStyles(currentTheme === 'dark'), [currentTheme]);

    return (
        <div className={styles.container}>
            {error && <p className={styles.errorMessage}>{error}</p>}
            {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

            <form className={styles.form} onSubmit={(e) => e.preventDefault()} style={{ marginBottom: '3rem' }}>
                <h2>Создать отзыв вручную</h2>
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
                        disabled={isSubmitting || isGeneratingFull || authLoading}
                    >
                        <option value="">Выберите категорию</option>
                        {categoryOptions.map((cat) => (
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
                            isDisabled={isSubmitting || isGeneratingFull || authLoading}
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
                            disabled={isSubmitting || isGeneratingFull || authLoading}
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
                        disabled={isSubmitting || isGeneratingFull || authLoading}
                    />
                </div>

                {category && title && (
                    <div className={styles.aiButtonGroup}>
                         <button
                            type="button"
                            onClick={handleAiFill}
                            disabled={isSubmitting || isGeneratingFull || !title || authLoading}
                            className={`${styles.aiButton} ${styles.submitButton}`}
                        >
                            {isSubmitting && successMessage.includes('Магия') ? '✨ Думаю...' : '🪄 Заполнить поля с помощью ИИ'}
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
                        disabled={isSubmitting || isGeneratingFull || authLoading}
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
                        disabled={isSubmitting || isGeneratingFull || authLoading}
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
                        disabled={isSubmitting || isGeneratingFull || authLoading}
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
                        disabled={isSubmitting || isGeneratingFull || authLoading}
                    />
                     {imagePreview && (
                        <div className={styles.imagePreviewContainer}>
                            <Image
                                src={imagePreview}
                                alt="Предпросмотр"
                                className={styles.imagePreview}
                                width={200}
                                height={200}
                                style={{ objectFit: 'contain' }}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.buttonGroup}>
                   <button
                       type="button"
                       onClick={() => router.push('/menu')}
                       className={`${styles.submitButton} ${styles.secondaryButton}`}
                       disabled={isSubmitting || isGeneratingFull || authLoading}
                   >
                        Назад в меню
                    </button>
                   <button
                       type="button"
                       onClick={handleSubmit}
                       className={styles.submitButton}
                       disabled={isSubmitting || isGeneratingFull || authLoading || !category || !title || !text || rating === 0 || (isMovieOrSeries && selectedGenres.length === 0) || (!isMovieOrSeries && !subcategory)}
                   >
                        {isSubmitting ? 'Публикация...' : 'Опубликовать вручную'}
                    </button>
                </div>

            </form>

            <hr className={styles.divider} />

            <div className={styles.form}>
                 <h2>Сгенерировать отзыв из источника (AI)</h2>
                 <p className={styles.aiDisclaimer}> 
                     Загрузите файл (.txt, аудио, видео) ИЛИ укажите ссылку (YouTube), 
                     укажите Twitch-ник автора контента, и AI попытается написать отзыв (требуется модерация).
                 </p>

                {aiFullError && <p className={styles.errorMessage}>{aiFullError}</p>}
                {aiFullSuccessMessage && <p className={styles.successMessage}>{aiFullSuccessMessage}</p>}

                <div className={styles.formGroup}>
                    <label htmlFor="authorTwitchNickname" className={styles.label}>Twitch Никнейм автора контента *</label>
                    <input
                        type="text"
                        id="authorTwitchNickname"
                        value={authorTwitchNickname}
                        onChange={(e) => setAuthorTwitchNickname(e.target.value.toLowerCase())}
                        className={styles.inputField}
                        placeholder="Введите никнейм автора на Twitch"
                        required
                        disabled={isUploadingSource || isGeneratingFull || authLoading}
                    />
                </div>
                <div className={styles.formGroup}>
                     <label htmlFor="sourceFileInput" className={styles.label}>Файл ИЛИ Ссылка на YouTube *</label>
                     <input
                         type="file"
                         id="sourceFileInput"
                         onChange={handleSourceFileChange}
                         accept=".txt,.mp3,.mp4,audio/*,video/*"
                         className={styles.fileInput}
                         disabled={isUploadingSource || isGeneratingFull || authLoading}
                     />
                     {sourceFile && <span className={styles.fileName}>Выбран файл: {sourceFile.name}</span>}
                    
                     <span className={styles.orSeparator}>ИЛИ</span>
                    
                     <input
                         type="url"
                         id="sourceUrlInput"
                         value={sourceUrl}
                         onChange={handleSourceUrlChange}
                         placeholder="Вставьте ссылку на YouTube видео"
                         className={styles.inputField}
                         style={{ marginTop: '10px' }}
                         disabled={isUploadingSource || isGeneratingFull || authLoading || !!sourceFile}
                     />
                 </div>
                 <button
                     type="button"
                     onClick={handleAiFullSubmit}
                     className={styles.submitButton}
                     disabled={!authorTwitchNickname || (!sourceFile && !sourceUrl) || isUploadingSource || isGeneratingFull || authLoading}
                 >
                     {isUploadingSource ? 'Загрузка файла...' : (isGeneratingFull ? 'Генерация отзыва...' : 'Сгенерировать из источника')}
                 </button>
            </div>

        </div>
    );
} 