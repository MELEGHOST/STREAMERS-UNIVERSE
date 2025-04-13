"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Select from 'react-select';
import { useUser } from '../../../context/UserContext';
import Button from '../../../components/ui/Button';
import { categories, movieGenres } from '../categories';
import styles from './create-review.module.css';
import useTelegram from '../../../hooks/useTelegram';

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
    const { user } = useUser();
    const { tg, themeParams, user: tgUser } = useTelegram();

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
        if (!user) {
            // Можно добавить редирект на логин, если пользователь не авторизован
            // router.push('/auth');
            console.log("Пользователь не авторизован, редирект или сообщение");
        }
    }, [user, router]);

    useEffect(() => {
        if (tg) {
            tg.BackButton.show();
            tg.BackButton.onClick(() => router.push('/menu'));

            // Настраиваем MainButton
            tg.MainButton.setText('Опубликовать отзыв');
            tg.MainButton.hide(); // Сначала скрыта

            // Показываем кнопку, только если форма валидна (хотя бы что-то заполнено)
            // Простая проверка, можно усложнить
            if (category && title && text && rating > 0 && (!isMovieOrSeries || selectedGenres.length > 0 || subcategory)) {
                tg.MainButton.show();
            } else {
                tg.MainButton.hide();
            }

            // Устанавливаем обработчик
            const mainButtonClickHandler = () => {
                handleSubmit();
            };
            tg.MainButton.onClick(mainButtonClickHandler);

            // Очистка при размонтировании
            return () => {
                tg.BackButton.offClick(() => router.push('/menu'));
                tg.BackButton.hide();
                tg.MainButton.offClick(mainButtonClickHandler);
                tg.MainButton.hide();
            };
        }
    }, [tg, router, category, title, text, rating, isMovieOrSeries, selectedGenres, subcategory, handleSubmit]); // Добавляем handleSubmit в зависимости

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
            setImageUrl(''); // Сбрасываем URL, если выбрали файл
        }
    };

    const handleImageUrlChange = (e) => {
        const url = e.target.value;
        setImageUrl(url);
        if (url) {
            setImagePreview(url); // Показываем превью по URL
            setImageFile(null); // Сбрасываем файл, если ввели URL
        }
         else {
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

            // Аккуратно обновляем поля, только если они пришли от AI
            if (data.text) setText(data.text);
            if (data.rating) setRating(parseInt(data.rating, 10) || 0);
            if (data.age_rating) setAgeRating(data.age_rating);
            if (data.image_url) {
                setImageUrl(data.image_url);
                setImagePreview(data.image_url);
                setImageFile(null);
            }
            if (isMovieOrSeries && data.genres && Array.isArray(data.genres)) {
                // Преобразуем строки жанров в формат { value: genre, label: genre }
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

    // Оборачиваем handleSubmit в useCallback
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

        let uploadedImageUrl = imageUrl; // Используем URL по умолчанию

        // 1. Загрузка изображения, если выбран файл
        if (imageFile) {
            const filePath = `reviews/${user.id}/${Date.now()}_${imageFile.name}`;
            try {
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('images') // Убедитесь, что бакет 'images' существует и доступен
                    .upload(filePath, imageFile);

                if (uploadError) {
                    console.error('Ошибка Supabase Storage Upload:', uploadError);
                    // Добавим более подробный вывод ошибки
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

                // Получаем публичный URL загруженного файла
                const { data: publicUrlData, error: urlError } = supabase.storage
                    .from('images')
                    .getPublicUrl(filePath);

                if (urlError) {
                    console.error("Ошибка получения public URL:", urlError);
                    // Загрузка прошла, но URL не получен. Можно использовать path,
                    // но лучше показать предупреждение.
                    setError('Изображение загружено, но не удалось получить публичную ссылку. Отзыв будет без картинки.');
                    uploadedImageUrl = null; // Явно обнуляем
                } else {
                    uploadedImageUrl = publicUrlData.publicUrl;
                    setImageUrl(uploadedImageUrl); // Обновляем состояние для отображения
                    console.log("Изображение загружено, URL:", uploadedImageUrl);
                }

            } catch (uploadError) {
                // Этот catch может сработать на другие ошибки, не связанные с Supabase напрямую
                console.error('Непредвиденная ошибка загрузки изображения:', uploadError);
                setError(`Не удалось загрузить изображение: ${uploadError.message}`);
                setIsSubmitting(false);
                return;
            }
        }

        // 2. Создание ревью в базе данных
        const reviewData = {
            author_id: user.id,
            category,
            title,
            text,
            rating,
            image_url: uploadedImageUrl, // Используем загруженный или введенный URL
            age_rating: ageRating || null, // Отправляем null, если пусто
            ...(isMovieOrSeries
                ? { genres: selectedGenres.map(g => g.value) } // Отправляем массив строк жанров
                : { subcategory: subcategory })
        };

        try {
            const { data, error: dbError } = await supabase
                .from('reviews')
                .insert(reviewData)
                .select(); // select() чтобы получить созданную запись

            if (dbError) {
                throw dbError;
            }

            setSuccessMessage('Отзыв успешно создан!');
            // Очистка формы или редирект
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

            tg?.HapticFeedback.notificationOccurred('success');
            // Можно добавить редирект на страницу отзыва или в меню
            // router.push(`/reviews/${data[0].id}`);
            setTimeout(() => {
                setSuccessMessage('');
                router.push('/menu'); // Возвращаемся в меню после успеха
            }, 2000);

        } catch (dbError) {
            console.error('Ошибка сохранения отзыва:', dbError);
            setError(`Не удалось сохранить отзыв: ${dbError.message}`);
            tg?.HapticFeedback.notificationOccurred('error');
        } finally {
            setIsSubmitting(false);
        }
    }, [user, category, title, text, rating, subcategory, selectedGenres, ageRating, imageUrl, imageFile, isMovieOrSeries, supabase, router, tg]); // Добавляем зависимости useCallback


    const genreOptions = movieGenres.map(genre => ({ value: genre, label: genre }));

    return (
        <div className={styles.container} style={{ backgroundColor: themeParams.bg_color, color: themeParams.text_color }}>
            {/* <h1 className={styles.title}>Создать новый отзыв</h1> */} {/* Заголовок обычно не нужен в Mini App */} 

            {error && <p className={styles.errorMessage}>{error}</p>}
            {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

            <form className={styles.form} onSubmit={(e) => e.preventDefault()}> {/* Предотвращаем стандартную отправку */} 
                <div className={styles.formGroup}>
                    <label htmlFor="category" className={styles.label}>Категория *</label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            // Сбрасываем подкатегорию/жанры при смене категории
                            setSubcategory('');
                            setSelectedGenres([]);
                        }}
                        className={styles.selectInput}
                        required
                        disabled={isSubmitting}
                    >
                        <option value="">Выберите категорию</option>
                        {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                {/* Условное отображение Жанры / Подкатегория */}
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
                            className={`${styles.reactSelectContainer} react-select-container`} // Добавляем класс для стилей
                            styles={reactSelectStyles(themeParams)}
                            required
                            isDisabled={isSubmitting}
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
                            disabled={isSubmitting}
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
                        disabled={isSubmitting}
                    />
                </div>

                {/* Кнопка AI */}
                {category && title && (
                    <div className={styles.aiButtonGroup}>
                         <Button
                            onClick={handleAiFill}
                            disabled={isSubmitting || !title}
                            variant="secondary"
                            className={styles.aiButton}
                        >
                            {isSubmitting && successMessage.includes('Магия') ? '✨ Думаю...' : '🪄 Заполнить с помощью ИИ'}
                        </Button>
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="imageFile" className={styles.label}>Или загрузите файл</label>
                    <input
                        type="file"
                        id="imageFile"
                        accept="image/*"
                        onChange={handleImageChange}
                        className={styles.fileInput} // Используем базовый стиль или кастомный
                        disabled={isSubmitting}
                    />
                     {imagePreview && (
                        <div className={styles.imagePreviewContainer}>
                            <img src={imagePreview} alt="Предпросмотр" className={styles.imagePreview} />
                        </div>
                    )}
                </div>


                {/* Кнопки управления теперь внизу или через MainButton Telegram */}
                 {/* <div className={styles.buttonGroup}>
                   <Button onClick={() => router.push('/menu')} variant="secondary" disabled={isSubmitting}>
                        Назад в меню
                    </Button>
                   <Button type="submit" onClick={handleSubmit} disabled={isSubmitting || !category || !title || !text || rating === 0 || (isMovieOrSeries && selectedGenres.length === 0) || (!isMovieOrSeries && !subcategory)}>
                        {isSubmitting ? 'Публикация...' : 'Опубликовать'}
                    </Button>
                </div> */} 

            </form>
        </div>
    );
} 