'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../../lib/supabase';
import FileUploader from '../../components/reviews/FileUploader';
import { DataStorage } from '../../utils/dataStorage';
import styles from './UploadForm.module.css';

export default function UploadForm() {
  const router = useRouter();
  const [authorName, setAuthorName] = useState('');
  const [authorSocialLink, setAuthorSocialLink] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState('');
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Обработчик изменения файлов
  const handleFilesSelected = (selectedFiles) => {
    setFiles(selectedFiles);
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!authorName || !productName || files.length === 0) {
      setErrorMessage('Пожалуйста, заполните все обязательные поля и загрузите хотя бы один файл.');
      return;
    }

    // Начинаем загрузку
    setIsUploading(true);

    try {
      // Получаем данные пользователя
      const userData = await DataStorage.getData('user');
      
      if (!userData || !userData.id) {
        setErrorMessage('Ошибка: не удалось получить данные пользователя. Пожалуйста, войдите в систему.');
        setIsUploading(false);
        return;
      }
      
      // Загружаем файлы в Supabase Storage
      const uploadedFiles = [];
      
      for (const file of files) {
        // Генерируем уникальное имя файла
        const fileExt = file.name.split('.').pop();
        const fileName = `${userData.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `reviews/${fileName}`;
        
        // Загружаем файл
        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Ошибка при загрузке файла:', uploadError);
          setErrorMessage(`Ошибка при загрузке файла ${file.name}: ${uploadError.message}`);
          setIsUploading(false);
          return;
        }
        
        // Добавляем путь к файлу в список загруженных файлов
        uploadedFiles.push(filePath);
      }
      
      // Создаем запись в базе данных
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          user_id: userData.id,
          author_name: authorName,
          author_social_link: authorSocialLink || null,
          content: '', // Будет заполнено нейросетью после обработки
          sources: [],  // Будет заполнено нейросетью после обработки
          original_files: uploadedFiles,
          status: 'pending',
          product_name: productName,
          category: category || null,
          rating: rating ? parseInt(rating, 10) : null
        })
        .select()
        .single();
      
      if (reviewError) {
        console.error('Ошибка при создании записи отзыва:', reviewError);
        setErrorMessage(`Ошибка при создании записи отзыва: ${reviewError.message}`);
        setIsUploading(false);
        return;
      }
      
      // Запускаем обработку файлов нейросетью
      const response = await fetch('/api/reviews/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId: reviewData.id,
          files: uploadedFiles,
          authorName,
          productName,
          category: category || undefined,
          rating: rating ? parseInt(rating, 10) : undefined
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Ошибка при обработке файлов нейросетью:', responseData.error);
        setErrorMessage(`Файлы загружены, но произошла ошибка при их обработке: ${responseData.error}`);
      } else {
        // Очищаем форму
        setAuthorName('');
        setAuthorSocialLink('');
        setProductName('');
        setCategory('');
        setRating('');
        setFiles([]);
        
        // Показываем сообщение об успехе
        setSuccessMessage('Отзыв успешно загружен и отправлен на обработку. После модерации он будет опубликован.');
        
        // Перенаправляем на страницу с отзывами через 3 секунды
        setTimeout(() => {
          router.push('/reviews');
        }, 3000);
      }
    } catch (error) {
      console.error('Произошла ошибка при загрузке отзыва:', error);
      setErrorMessage('Произошла непредвиденная ошибка при загрузке отзыва. Пожалуйста, попробуйте позже.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      {errorMessage && (
        <div className={styles.errorMessage}>
          {errorMessage}
        </div>
      )}
      
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="authorName" className={styles.label}>
            Имя автора отзыва <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="authorName"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className={styles.input}
            placeholder="Введите имя автора отзыва"
            disabled={isUploading}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="authorSocialLink" className={styles.label}>
            Ссылка на социальную сеть автора
          </label>
          <input
            type="url"
            id="authorSocialLink"
            value={authorSocialLink}
            onChange={(e) => setAuthorSocialLink(e.target.value)}
            className={styles.input}
            placeholder="https://example.com/profile"
            disabled={isUploading}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="productName" className={styles.label}>
            Название продукта <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className={styles.input}
            placeholder="Введите название продукта"
            disabled={isUploading}
            required
          />
        </div>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              Категория
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={styles.select}
              disabled={isUploading}
            >
              <option value="">Выберите категорию</option>
              <option value="electronics">Электроника</option>
              <option value="clothing">Одежда</option>
              <option value="food">Еда</option>
              <option value="games">Игры</option>
              <option value="services">Услуги</option>
              <option value="other">Другое</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="rating" className={styles.label}>
              Рейтинг (1-5)
            </label>
            <select
              id="rating"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className={styles.select}
              disabled={isUploading}
            >
              <option value="">Выберите рейтинг</option>
              <option value="1">1 - Ужасно</option>
              <option value="2">2 - Плохо</option>
              <option value="3">3 - Нормально</option>
              <option value="4">4 - Хорошо</option>
              <option value="5">5 - Отлично</option>
            </select>
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Файлы с отзывом <span className={styles.required}>*</span>
          </label>
          <FileUploader
            onFilesSelected={handleFilesSelected}
            acceptedTypes={['image/*', 'video/*', 'text/plain']}
            maxFiles={5}
            maxSizeMB={10}
          />
        </div>
        
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={() => router.push('/reviews')}
            className={styles.cancelButton}
            disabled={isUploading}
          >
            Отмена
          </button>
          
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isUploading}
          >
            {isUploading ? 'Загрузка...' : 'Загрузить отзыв'}
          </button>
        </div>
      </form>
    </div>
  );
} 