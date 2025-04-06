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
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [authorTwitchId, setAuthorTwitchId] = useState('');

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
          const maxFileSize = 50 * 1024 * 1024; // Лимит 50 MB (примерный)

          if (!allowedTypes.includes(selectedFile.type) && !selectedFile.type.startsWith('audio/') && !selectedFile.type.startsWith('video/')) {
               setFile(null);
               event.target.value = null;
               setError(`Неподдерживаемый тип файла: ${selectedFile.type}. Разрешены .txt, .mp3, .mp4 и другие аудио/видео.`);
               return;
          }
          
          if (selectedFile.size > maxFileSize) {
               setFile(null);
               event.target.value = null;
               setError(`Файл слишком большой (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB). Максимальный размер: 50 MB.`);
               return;
          }

          setFile(selectedFile);
          setError(null);
      }
  };

  // Обработчик отправки ручного отзыва
  const handleManualSubmit = async (e) => {
      e.preventDefault();
      if (!category || !itemName || rating === 0 || !textContent) {
          setError('Пожалуйста, заполните все обязательные поля: Категория, Название, Рейтинг и Текст отзыва.');
          return;
      }
      if (!user || !supabase) {
          setError('Ошибка аутентификации.');
          return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
          const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);
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
                  textContent,
              }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
          }

          const newReview = await response.json();
          setSuccessMessage(`Отзыв успешно создан! ID: ${newReview.id}`);
          // Очищаем форму и перенаправляем
          setCategory(''); setSubcategory(''); setItemName(''); setRating(0); setTextContent('');
          setTimeout(() => router.push('/reviews'), 1500);

      } catch (err) {
          console.error('Submit review error:', err);
          setError(err.message || 'Не удалось отправить отзыв.');
      } finally {
          setIsSubmitting(false);
      }
  };

  // Обработчик загрузки файла и генерации ИИ отзыва
  const handleAiSubmit = async () => {
      if (!category || !itemName || !authorTwitchId) {
          setError('Пожалуйста, укажите Категорию, Название объекта и Twitch ID автора перед загрузкой файла.');
          return;
      }
      if (!file) {
          setError('Пожалуйста, выберите .txt файл для генерации отзыва.');
          return;
      }
      if (!user || !supabase) {
          setError('Ошибка аутентификации.');
          return;
      }

      setIsUploading(true);
      setIsGenerating(true);
      setError(null);
      setSuccessMessage(null);

      try {
          // 1. Загрузка файла в Supabase Storage
          const filePath = `review_sources/${user.id}/${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
              .from('reviews-sources') // Название бакета (нужно создать)
              .upload(filePath, file);
          
          if (uploadError) throw new Error(`Ошибка загрузки файла: ${uploadError.message}`);
          if (!uploadData?.path) throw new Error('Не удалось получить путь к загруженному файлу.');

          console.log('Файл успешно загружен:', uploadData.path);
          setIsUploading(false); // Загрузка завершена

          // 2. Вызов API для генерации отзыва
          const response = await fetch('/api/reviews/generate', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
              },
              body: JSON.stringify({ 
                  category, 
                  subcategory,
                  itemName, 
                  sourceFilePath: uploadData.path,
                  authorTwitchId
              }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Ошибка генерации отзыва (${response.status})`);
          }

          setSuccessMessage('Файл загружен, отзыв генерируется и отправлен на модерацию!');
           // Очищаем форму и перенаправляем
          setCategory(''); setSubcategory(''); setItemName(''); setFile(null); setAuthorTwitchId('');
          setTimeout(() => router.push('/reviews'), 2000);

      } catch (err) {
          console.error('Ошибка генерации AI отзыва:', err);
          setError('Не удалось сгенерировать отзыв: ' + err.message);
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
        <form onSubmit={handleManualSubmit} className={styles.form}>
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
                  <label htmlFor="textContent" className={styles.label}>Ваш отзыв*:</label>
                  <textarea id="textContent" value={textContent} onChange={(e) => setTextContent(e.target.value)} className={styles.textarea} rows="6" placeholder="Поделитесь вашим мнением..." required />
                </div>
             </div>
             <button 
                 type="submit" 
                 className={styles.submitButton} 
                 disabled={isSubmitting || isGenerating} // Блокируем при любой отправке
             >
                 {isSubmitting ? 'Публикация...' : 'Опубликовать отзыв'}
             </button>
        </form>

        <hr className={styles.divider} />

        {/* --- Форма для AI отзыва --- */} 
        <div className={styles.form}>
            <h2>Сгенерировать отзыв с помощью AI</h2>
            <p className={styles.aiDisclaimer}>Загрузите файл (.txt, .mp3, .mp4), и AI попытается написать отзыв на его основе (требуется модерация).</p>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="authorTwitchId" className={styles.label}>Twitch ID автора контента*:</label>
                <input 
                    type="text" 
                    id="authorTwitchId" 
                    value={authorTwitchId} 
                    onChange={(e) => setAuthorTwitchId(e.target.value)} 
                    className={styles.input} 
                    placeholder="Введите ID канала автора на Twitch"
                    required
                    disabled={isUploading || isGenerating || isSubmitting}
                />
            </div>
            <div className={styles.formGrid}>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="fileInput" className={styles.label}>Файл (.txt, .mp3, .mp4)*:</label>
                    <input 
                        type="file" 
                        id="fileInput" 
                        onChange={handleFileChange} 
                        accept=".txt,.mp3,.mp4,audio/*,video/*"
                        className={styles.fileInput} 
                        disabled={isUploading || isGenerating || isSubmitting}
                    />
                     {file && <span className={styles.fileName}>Выбран файл: {file.name}</span>}
                </div>
            </div>
            <button 
                onClick={handleAiSubmit} 
                className={styles.submitButton} 
                disabled={!file || isUploading || isGenerating || isSubmitting || !category || !itemName || !authorTwitchId}
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