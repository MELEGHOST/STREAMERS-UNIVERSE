'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import styles from './create-review.module.css';
import pageStyles from '../../../styles/page.module.css';
import { reviewCategories } from '../categories';

// Компонент для выбора рейтинга (звездочки)
const RatingInput = ({ rating, setRating }) => {
    return (
        <div className={styles.ratingInput}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={star <= rating ? styles.starFilled : styles.starEmpty}
                    onClick={() => setRating(star)}
                >
                    ★
                </span>
            ))}
        </div>
    );
};

export default function CreateReviewPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, supabase } = useAuth();
  const title = "Создать отзыв";

  // Состояния формы
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [itemName, setItemName] = useState('');
  const [rating, setRating] = useState(0); // 0 - не выбрано
  const [reviewText, setReviewText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [authorTwitchNickname, setAuthorTwitchNickname] = useState('');
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');

  // Получаем список основных категорий
  const mainCategories = Object.keys(reviewCategories);
  // Получаем список подкатегорий для выбранной основной
  const subcategories = category ? reviewCategories[category] || {} : {};
  const subcategoryNames = Object.keys(subcategories);

  // Сброс подкатегории при смене основной категории
  useEffect(() => {
     setSubcategory(''); 
  }, [category]);

  // Обработчик выбора файла
  const handleFileChange = (event) => {
      if (event.target.files && event.target.files[0]) {
          const selectedFile = event.target.files[0];
          // Проверяем тип файла на клиенте для быстрой обратной связи
          const allowedTypes = ['text/plain', 'audio/mpeg', 'audio/mp4', 'video/mp4', 'audio/wav', 'audio/ogg'];
          // Добавляем больше MIME типов при необходимости

          if (!allowedTypes.includes(selectedFile.type) && !selectedFile.type.startsWith('audio/') && !selectedFile.type.startsWith('video/')) {
               setFile(null);
               event.target.value = null;
               setError(`Неподдерживаемый тип файла: ${selectedFile.type}. Разрешены .txt, .mp3, .mp4 и другие аудио/видео.`);
               return;
          }

          setFile(selectedFile);
          setError(null);
      }
  };

  // Обработчик изменения URL
  const handleUrlChange = (event) => {
      const url = event.target.value;
      setSourceUrl(url);
      if (url) { // Если ввели URL, сбрасываем файл
          setFile(null);
          // Опционально: сбросить значение input[type=file]
          const fileInput = document.getElementById('fileInput');
          if (fileInput) fileInput.value = '';
      }
      setError(null);
  };

  // Обработчик выбора файла картинки
  const handleImageFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        // Проверка типа файла (опционально, но полезно)
        if (!file.type.startsWith('image/')) {
            setError('Пожалуйста, выберите файл изображения (JPEG, PNG, GIF, WEBP и т.д.).');
            setImageFile(null);
            event.target.value = null; // Сбросить инпут
            return;
        }
        // Проверка размера (опционально)
        const maxSize = 5 * 1024 * 1024; // 5 MB
        if (file.size > maxSize) {
             setError(`Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} MB). Максимальный размер: 5 MB.`);
             setImageFile(null);
             event.target.value = null;
             return;
        }
        setImageFile(file);
        setError(null);
    } else {
        setImageFile(null); // Сбросить, если файл не выбран
    }
  };

  // Обработчик отправки ручного отзыва
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!category || !itemName || rating < 1 || !reviewText) {
      setError('Пожалуйста, заполните все обязательные поля (Категория, Название, Рейтинг, Текст отзыва).');
      return;
    }
    if (!user || !supabase) {
        setError('Ошибка аутентификации. Попробуйте перезайти.');
        return;
    }

    setIsSubmitting(true);
    setIsUploadingImage(!!imageFile); // Устанавливаем флаг загрузки, если есть файл
    setError(null);
    setSuccessMessage(null);

    let uploadedImageUrl = null;

    try {
      // Загрузка картинки, если она есть
      if (imageFile) {
          console.log('[ReviewCreate] Загрузка изображения...');
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${user.id}_${Date.now()}.${fileExt}`;
          const filePath = `public/${fileName}`;

          const { error: uploadError } = await supabase.storage
              .from('reviews-images')
              .upload(filePath, imageFile);

          if (uploadError) {
              throw new Error(`Ошибка загрузки изображения: ${uploadError.message}`);
          }
          
          // Получаем публичный URL загруженного файла
          const { data: publicUrlData } = supabase.storage
              .from('reviews-images')
              .getPublicUrl(filePath);
              
          if (!publicUrlData?.publicUrl) {
              console.warn('[ReviewCreate] Не удалось получить public URL для изображения, но загрузка прошла.');
              // Можно попробовать сохранить просто path, но лучше URL
              // uploadedImageUrl = filePath; 
          } else {
                uploadedImageUrl = publicUrlData.publicUrl;
                console.log('[ReviewCreate] Изображение загружено: ', uploadedImageUrl);
          }
          setIsUploadingImage(false); // Загрузка картинки завершена
      }
      
      // Отправка данных отзыва на API
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          subcategory,
          itemName,
          rating,
          reviewText,
          imageUrl: uploadedImageUrl, // Передаем URL картинки
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось создать отзыв.');
      }

      setSuccessMessage('Отзыв успешно создан и отправлен на модерацию!');
      // Очистка формы
      setCategory(''); setSubcategory(''); setItemName(''); setRating(0); setReviewText(''); setImageFile(null); // Сбрасываем imageFile
      // Опционально сбросить инпут файла картинки
      const imageInput = document.getElementById('imageFile');
      if (imageInput) imageInput.value = null; 
      
      // Можно перенаправить пользователя или обновить список отзывов
      setTimeout(() => router.push('/reviews'), 2000); // Пример редиректа

    } catch (err) {
      console.error('Ошибка создания отзыва:', err);
      setError(err.message || 'Произошла ошибка.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  // Обработчик загрузки файла ИЛИ ИСПОЛЬЗОВАНИЯ ССЫЛКИ и генерации ИИ отзыва
  const handleAiSubmit = async () => {
      if (!authorTwitchNickname) {
          setError('Пожалуйста, укажите Twitch Никнейм автора контента.');
          return;
      }
      // Проверка: должен быть либо файл, либо URL
      if (!file && !sourceUrl) {
          setError('Пожалуйста, выберите файл ИЛИ укажите URL для генерации отзыва.');
          return;
      }
      // Проверка, чтобы не было и файла, и URL одновременно
      if (file && sourceUrl) {
          setError('Пожалуйста, используйте что-то одно: либо файл, либо URL.');
          return;
      }

      setIsUploading(!!file); // Ставим uploading только если есть файл
      setIsGenerating(true);
      setError(null);
      setSuccessMessage(null);

      try {
          let sourceFilePath = null; // Теперь может быть null
          if (file) { // Если есть файл, грузим его
              const filePath = `public/${user.id}/${Date.now()}_${file.name}`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('reviews-sources')
                  .upload(filePath, file);

              if (uploadError) throw new Error(`Ошибка загрузки файла: ${uploadError.message}`);
              sourceFilePath = uploadData.path;
              console.log('[ReviewCreate] Файл успешно загружен:', sourceFilePath);
              setIsUploading(false); 
          }

          // Отправляем запрос на генерацию
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;

          const response = await fetch('/api/ai/generate-review', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                  sourcePath: sourceFilePath, // Путь к файлу в storage (или null)
                  sourceUrl: sourceUrl,       // URL (или null)
                  authorTwitchName: authorTwitchNickname,
              })
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Ошибка генерации AI отзыва.');
          }

          const result = await response.json();
          console.log('[ReviewCreate] AI Review generated:', result);
          setSuccessMessage(result.message || 'AI Отзыв успешно сгенерирован и отправлен на модерацию!');

          // Очистка полей AI
          setAuthorTwitchNickname('');
          setFile(null);
          setSourceUrl('');
          const fileInput = document.getElementById('fileInput');
          if (fileInput) fileInput.value = '';

      } catch (err) {
          console.error('Ошибка генерации AI отзыва:', err);
          setError(err.message || 'Произошла ошибка при генерации.');
      } finally {
          setIsUploading(false);
          setIsGenerating(false);
      }
  };

  // useEffect для редиректа
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth?next=/reviews/create');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div><p>Загрузка...</p>
      </div>
    );
  }
  if (!isAuthenticated) { return null; }

  return (
    <div className={pageStyles.container}>
        <h1 className={styles.title}>{title}</h1>

        {error && <div className={pageStyles.errorMessage} style={{ marginBottom: '1rem' }}>{error}</div>}
        {successMessage && <div className={pageStyles.successMessage} style={{ marginBottom: '1rem' }}>{successMessage}</div>}

        {/* --- Форма для ручного отзыва --- */} 
        <form onSubmit={handleSubmit} className={styles.form}>
             <h2>Написать отзыв вручную</h2>
             <div className={styles.formGrid}> {/* Grid для полей */} 
                <div className={styles.formGroup}>
                  <label htmlFor="category" className={styles.label}>Категория*:</label>
                  <select 
                     id="category"
                     value={category}
                     onChange={(e) => setCategory(e.target.value)}
                     required
                     className={styles.selectInput}
                  >
                     <option value="" disabled>-- Выберите категорию --</option>
                     {mainCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                     ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="subcategory" className={styles.label}>Подкатегория:</label>
                  <select 
                     id="subcategory"
                     value={subcategory}
                     onChange={(e) => setSubcategory(e.target.value)}
                     className={styles.selectInput}
                  >
                     <option value="">-- Выберите подкатегорию --</option>
                     {subcategoryNames.map(subcat => (
                        <option key={subcat} value={subcat}>{subcat}</option>
                     ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="itemName" className={styles.label}>Название объекта*:</label>
                  <input type="text" id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} className={styles.input} placeholder="Название фильма, игры..." required />
                </div>
                 <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}> {/* Рейтинг на всю ширину */} 
                   <label className={styles.label}>Рейтинг*:</label>
                   <RatingInput rating={rating} setRating={setRating} />
                 </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}> {/* Текст на всю ширину */} 
                  <label htmlFor="reviewText" className={styles.label}>Ваш отзыв*:</label>
                  <textarea id="reviewText" value={reviewText} onChange={(e) => setReviewText(e.target.value)} className={styles.textarea} rows="6" placeholder="Поделитесь вашим мнением..." required />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="imageFile" className={styles.label}>Изображение (необязательно, макс. 5MB):</label>
                    <input 
                        type="file"
                        id="imageFile"
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        onChange={handleImageFileChange}
                        className={styles.fileInput}
                        disabled={isSubmitting || isUploadingImage}
                    />
                    {imageFile && <span className={styles.fileName}>Выбрано: {imageFile.name}</span>}
                </div>
             </div>
             <button 
                 type="submit" 
                 className={styles.submitButton} 
                 disabled={isSubmitting || isUploadingImage}
             >
                 {isUploadingImage ? 'Загрузка фото...' : (isSubmitting ? 'Отправка...' : 'Отправить отзыв')}
             </button>
        </form>

        <hr className={styles.divider} />

        {/* --- Форма для AI отзыва --- */} 
        <div className={styles.form}>
            <h2>Сгенерировать отзыв с помощью AI</h2>
            <p className={styles.aiDisclaimer}>
                Загрузите файл (.txt, аудио, видео) ИЛИ укажите ссылку (YouTube), 
                и AI попытается написать отзыв (требуется модерация).
            </p>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="authorTwitchNickname" className={styles.label}>Twitch Никнейм автора контента*:</label>
                <input 
                    type="text" 
                    id="authorTwitchNickname" 
                    value={authorTwitchNickname} 
                    onChange={(e) => setAuthorTwitchNickname(e.target.value.toLowerCase())}
                    className={styles.input} 
                    placeholder="Введите никнейм автора на Twitch"
                    required
                    disabled={isUploading || isGenerating || isSubmitting}
                />
            </div>
            <div className={styles.formGrid}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="fileInput" className={styles.label}>Файл ИЛИ Ссылка*:</label>
                    <input 
                        type="file" 
                        id="fileInput" 
                        onChange={handleFileChange} 
                        accept=".txt,.mp3,.mp4,audio/*,video/*"
                        className={styles.fileInput} 
                        disabled={isUploading || isGenerating || isSubmitting}
                    />
                    {file && <span className={styles.fileName}>Выбран файл: {file.name}</span>}
                    
                    <span className={styles.orSeparator}>ИЛИ</span>
                    
                    <input 
                        type="url"
                        id="sourceUrl" 
                        value={sourceUrl} 
                        onChange={handleUrlChange} 
                        placeholder="Вставьте ссылку на YouTube видео или Twitch клип"
                        className={styles.input} 
                        style={{ marginTop: '10px' }}
                        disabled={isUploading || isGenerating || isSubmitting || !!file}
                    />
                </div>
            </div>
            <button 
                type="button" 
                onClick={handleAiSubmit} 
                className={`${pageStyles.button} ${styles.submitButton}`}
                disabled={!authorTwitchNickname || (!file && !sourceUrl) || isUploading || isGenerating}
            >
                {isUploading ? 'Загрузка файла...' : (isGenerating ? 'Генерация отзыва...' : 'Загрузить и сгенерировать')}
            </button>
        </div>

        <button onClick={() => router.push('/reviews')} className={pageStyles.backButton} style={{ marginTop: '2rem' }}>
            &larr; Назад к отзывам
        </button>
    </div>
  );
} 