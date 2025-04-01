'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// import supabase from '../../../lib/supabase'; // УДАЛЯЕМ, получаем как пропс
import FileUploader from '../../components/reviews/FileUploader';
// import { DataStorage } from '../../utils/dataStorage'; // УДАЛЯЕМ
import styles from './UploadForm.module.css';

export default function UploadForm({ supabase }) { // Получаем supabase как пропс
  const router = useRouter();
  const searchParams = useSearchParams(); // Получаем параметры URL
  const [authorName, setAuthorName] = useState('');
  const [authorSocialLink, setAuthorSocialLink] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState('');
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState(['']); // Состояние для ссылок
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Предзаполнение полей из URL при загрузке компонента
  useEffect(() => {
    const targetUserName = searchParams.get('targetUserName');
    const targetUserId = searchParams.get('targetUserId'); // Может понадобиться позже
    // const defaultProduct = searchParams.get('productName'); // Пример

    if (targetUserName) {
        setAuthorName(targetUserName); // Предзаполняем имя автора
    }
    // if (defaultProduct) {
    //     setProductName(defaultProduct); // Предзаполняем продукт
    // }
  }, [searchParams]); // Зависимость от searchParams

  // Обработчик изменения файлов
  const handleFilesSelected = (selectedFiles) => {
    setFiles(selectedFiles);
  };

  // Функции для управления ссылками
  const handleLinkChange = (index, value) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const addLinkInput = () => {
    setLinks([...links, '']);
  };

  const removeLinkInput = (index) => {
    const newLinks = links.filter((_, i) => i !== index);
    // Если удалили все поля, оставляем одно пустое
    setLinks(newLinks.length > 0 ? newLinks : ['']); 
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Фильтруем пустые ссылки перед валидацией и отправкой
    const validLinks = links.filter(link => link.trim() !== '');

    // Добавляем проверку: хотя бы один файл ИЛИ одна ссылка
    if (!authorName || !productName || (files.length === 0 && validLinks.length === 0)) {
      setErrorMessage('Пожалуйста, заполните имя автора, название продукта и загрузите хотя бы один файл или добавьте ссылку.');
      return;
    }

    // Начинаем загрузку
    setIsUploading(true);

    try {
      // Получаем ID пользователя из сессии Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setErrorMessage('Ошибка: Сессия не найдена. Пожалуйста, перезайдите.');
        setIsUploading(false);
        return;
      }
      const userId = session.user.id;
      if (!userId) {
         setErrorMessage('Ошибка: Не удалось получить ID пользователя из сессии.');
         setIsUploading(false);
         return;
      }
      
      // Загружаем файлы в Supabase Storage
      const uploadedFiles = [];
      
      if (files.length > 0) {
        console.log('Загрузка файлов...');
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
          // Используем бакет 'reviews' как в API
          const filePath = `reviews/${fileName}`; 
          
          // Используем клиент supabase из пропсов
          const { error: uploadError } = await supabase.storage
            .from('reviews') // Убедитесь, что бакет 'reviews' существует и настроен
            .upload(filePath, file);
          
          if (uploadError) {
            console.error('Ошибка при загрузке файла:', uploadError);
            setErrorMessage(`Ошибка при загрузке файла ${file.name}: ${uploadError.message}`);
            setIsUploading(false);
            return;
          }
          
          uploadedFiles.push(filePath);
        }
        console.log('Файлы загружены:', uploadedFiles);
      }
      
      // Создаем запись в базе данных
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          user_id: userId, // ID пользователя, который загрузил (модератор/админ)
          author_name: authorName,
          author_social_link: authorSocialLink || null,
          content: '', 
          sources: validLinks,  
          original_files: uploadedFiles,
          status: 'pending', 
          product_name: productName,
          category: category || null,
          rating: rating ? parseInt(rating, 10) : null,
          created_at: new Date().toISOString(), // Добавляем, т.к. default now() может не сработать для status pending
          updated_at: new Date().toISOString(),
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
      // Передаем ID созданного отзыва
      const response = await fetch('/api/reviews/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Куки сессии должны автоматически передаваться
        },
        body: JSON.stringify({
          reviewId: reviewData.id,
          // Передаем пути к файлам в Storage
          files: uploadedFiles, 
          links: validLinks,
          // Можно передать доп. инфо, если AI будет это использовать
          authorName,
          productName,
          category: category || undefined,
          rating: rating ? parseInt(rating, 10) : undefined,
          authorSocialLink: authorSocialLink || undefined
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Ошибка при запуске обработки AI:', responseData.error);
        // Отзыв создан, но AI не запустился - нужно сообщить админу или обработать иначе?
        // Пока показываем ошибку, но оставляем файлы и запись
        setErrorMessage(`Файлы загружены, запись создана (ID: ${reviewData.id}), но произошла ошибка при запуске обработки AI: ${responseData.error || response.statusText}`);
      } else {
        // Очищаем форму и показываем сообщение об успехе
        setAuthorName('');
        setAuthorSocialLink('');
        setProductName('');
        setCategory('');
        setRating('');
        setFiles([]);
        setLinks(['']);
        
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
              {/* Нужно будет подгружать категории динамически */} 
              <option value="hardware">Техника</option>
              <option value="peripherals">Периферия</option>
              <option value="furniture">Мебель</option>
              <option value="lighting">Освещение</option>
              <option value="audio">Аудио</option>
              <option value="software">ПО</option>
              <option value="games">Игры</option>
              <option value="merch">Мерч</option>
              <option value="services">Сервисы</option>
              <option value="accessories">Аксессуары</option>
              <option value="cameras">Камеры</option>
              <option value="other">Прочее</option>
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
        
        {/* --- Поле для ссылок --- */} 
        <div className={styles.formGroup}>
            <label className={styles.label}>Ссылки на отзывы/источники</label>
            {links.map((link, index) => (
                <div key={index} className={styles.linkInputGroup}>
                    <input
                        type="url"
                        value={link}
                        onChange={(e) => handleLinkChange(index, e.target.value)}
                        className={styles.input}
                        placeholder="https://example.com/review"
                        disabled={isUploading}
                    />
                    {links.length > 1 && (
                        <button 
                            type="button" 
                            onClick={() => removeLinkInput(index)}
                            className={styles.removeLinkButton}
                            disabled={isUploading}
                            title="Удалить ссылку"
                        >
                            ×
                        </button>
                    )}
                </div>
            ))}
            <button 
                type="button" 
                onClick={addLinkInput}
                className={styles.addLinkButton}
                disabled={isUploading}
            >
                + Добавить еще ссылку
            </button>
        </div>
        {/* --- Конец поля для ссылок --- */} 

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Файлы с отзывом (txt, png, jpg, mp3, wav, mp4)
          </label>
          <FileUploader
            onFilesSelected={handleFilesSelected}
            // Расширяем типы, но помним об ограничениях AI
            acceptedTypes={['text/plain', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'video/mp4']} 
            maxFiles={5}
            maxSizeMB={25} // Увеличим немного лимит для аудио/видео?
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