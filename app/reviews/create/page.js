'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './create-review.module.css';
import pageStyles from '../../../../styles/page.module.css';

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
  const { user, isLoading, isAuthenticated, supabase } = useAuth();
  const router = useRouter();
  const title = "Создать отзыв";

  // Состояния формы
  const [category, setCategory] = useState('');
  const [itemName, setItemName] = useState('');
  const [rating, setRating] = useState(0); // 0 - не выбрано
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Обработчик выбора файла
  const handleFileChange = (event) => {
      if (event.target.files && event.target.files[0]) {
          const selectedFile = event.target.files[0];
          // Ограничение на TXT файлы
          if (selectedFile.type === 'text/plain') {
             setFile(selectedFile);
             setError(null); // Сбрасываем ошибку типа файла
          } else {
              setFile(null);
              event.target.value = null; // Сбрасываем input
              setError('Пожалуйста, выберите файл в формате .txt');
          }
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
          const { error: insertError } = await supabase
              .from('reviews')
              .insert({
                  user_id: user.id,
                  category,
                  item_name: itemName,
                  rating,
                  text_content: textContent,
                  status: 'approved' // Ручные отзывы сразу одобрены
              });
          
          if (insertError) throw insertError;

          setSuccessMessage('Ваш отзыв успешно опубликован!');
          // Очищаем форму и перенаправляем
          setCategory(''); setItemName(''); setRating(0); setTextContent('');
          setTimeout(() => router.push('/reviews'), 1500);

      } catch (err) {
          console.error('Ошибка сохранения ручного отзыва:', err);
          setError('Не удалось сохранить отзыв: ' + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  // Обработчик загрузки файла и генерации ИИ отзыва
  const handleAiSubmit = async () => {
      if (!category || !itemName) {
          setError('Пожалуйста, укажите Категорию и Название объекта отзыва перед загрузкой файла.');
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
                  itemName, 
                  sourceFilePath: uploadData.path // Передаем путь к файлу
              }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Ошибка генерации отзыва (${response.status})`);
          }

          setSuccessMessage('Файл загружен, отзыв генерируется и отправлен на модерацию!');
           // Очищаем форму и перенаправляем
          setCategory(''); setItemName(''); setRating(0); setFile(null);
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
      router.push(`/auth?next=/reviews/create`);
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
                  <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={styles.input} placeholder="Фильм, Игра, Книга..." required />
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
            <h2>Сгенерировать отзыв с помощью AI (из .txt файла)</h2>
            <p className={styles.aiDisclaimer}>Загрузите текстовый файл (например, ваше эссе, заметки), и AI попытается написать отзыв на его основе. Сгенерированный отзыв будет отправлен на модерацию.</p>
            <div className={styles.formGrid}>
                {/* Поля Категория и Название используются из ручной формы */} 
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="fileInput" className={styles.label}>TXT Файл*:</label>
                    <input 
                        type="file" 
                        id="fileInput" 
                        onChange={handleFileChange} 
                        accept=".txt" 
                        className={styles.fileInput} 
                        disabled={isUploading || isGenerating}
                    />
                     {file && <span className={styles.fileName}>Выбран файл: {file.name}</span>}
                </div>
            </div>
            <button 
                onClick={handleAiSubmit} 
                className={styles.submitButton} 
                disabled={!file || isUploading || isGenerating || isSubmitting || !category || !itemName} // Блокируем, если нет файла, категории, названия или идет процесс
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