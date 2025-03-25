'use client';

import { useState, useRef } from 'react';
import styles from './FileUploader.module.css';

/**
 * Компонент для загрузки файлов с превью
 * @param {Object} props - Свойства компонента
 * @param {function} props.onFilesSelected - Функция обратного вызова при выборе файлов
 * @param {Array<string>} props.acceptedTypes - Массив допустимых MIME-типов
 * @param {number} props.maxFiles - Максимальное количество файлов (по умолчанию 5)
 * @param {number} props.maxSizeMB - Максимальный размер файла в МБ (по умолчанию 10)
 */
export default function FileUploader({ 
  onFilesSelected, 
  acceptedTypes = ['image/*', 'video/*', 'text/plain'], 
  maxFiles = 5, 
  maxSizeMB = 10 
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Обработка выбора файлов
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    processFiles(files);
  };

  // Обработка перетаскивания файлов
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    
    if (event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      processFiles(files);
    }
  };

  // Проверка и обработка файлов
  const processFiles = (files) => {
    // Очищаем предыдущие ошибки
    setErrors([]);
    
    // Проверяем ограничение на количество файлов
    if (selectedFiles.length + files.length > maxFiles) {
      setErrors(prev => [...prev, `Вы можете загрузить максимум ${maxFiles} файлов.`]);
      return;
    }

    const newSelectedFiles = [...selectedFiles];
    const newPreviewUrls = [...previewUrls];
    const newErrors = [];

    files.forEach(file => {
      // Проверяем размер файла
      if (file.size > maxSizeMB * 1024 * 1024) {
        newErrors.push(`Файл "${file.name}" превышает максимальный размер в ${maxSizeMB} МБ.`);
        return;
      }

      // Проверяем тип файла
      const isAcceptedType = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          const mainType = type.split('/')[0];
          return file.type.startsWith(`${mainType}/`);
        }
        return file.type === type;
      });

      if (!isAcceptedType) {
        newErrors.push(`Файл "${file.name}" имеет неподдерживаемый формат.`);
        return;
      }

      // Добавляем файл в список выбранных
      newSelectedFiles.push(file);

      // Создаем превью для файла
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push({ url, type: 'image', name: file.name });
      } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push({ url, type: 'video', name: file.name });
      } else if (file.type === 'text/plain') {
        newPreviewUrls.push({ url: null, type: 'text', name: file.name });
      } else {
        newPreviewUrls.push({ url: null, type: 'unknown', name: file.name });
      }
    });

    // Обновляем состояния
    setSelectedFiles(newSelectedFiles);
    setPreviewUrls(newPreviewUrls);
    setErrors(newErrors);

    // Вызываем функцию обратного вызова с выбранными файлами
    onFilesSelected(newSelectedFiles);
  };

  // Удаление файла из списка
  const removeFile = (index) => {
    const newSelectedFiles = [...selectedFiles];
    const newPreviewUrls = [...previewUrls];

    // Очищаем URL объекта для предотвращения утечек памяти
    if (newPreviewUrls[index].url) {
      URL.revokeObjectURL(newPreviewUrls[index].url);
    }

    newSelectedFiles.splice(index, 1);
    newPreviewUrls.splice(index, 1);

    setSelectedFiles(newSelectedFiles);
    setPreviewUrls(newPreviewUrls);
    onFilesSelected(newSelectedFiles);
  };

  // Обработчики для drag and drop
  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Обработчик для открытия диалога выбора файлов
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.fileUploaderContainer}>
      <div 
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept={acceptedTypes.join(',')}
          className={styles.fileInput}
        />
        <div className={styles.uploadIcon}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M12 12.586l4.243-4.242 1.415 1.414L12 15.415l-5.657-5.657 1.414-1.414L12 12.586z"/>
            <path d="M12 3a9 9 0 0 1 9 9v2h-2v-2a7 7 0 0 0-7-7 7 7 0 0 0-7 7v2H3v-2a9 9 0 0 1 9-9z"/>
          </svg>
        </div>
        <p className={styles.dropZoneText}>
          Перетащите файлы сюда или нажмите для выбора
        </p>
        <p className={styles.dropZoneSubtext}>
          Поддерживаемые форматы: изображения, видео, текстовые файлы
        </p>
      </div>

      {/* Список ошибок */}
      {errors.length > 0 && (
        <div className={styles.errorList}>
          {errors.map((error, index) => (
            <div key={index} className={styles.errorItem}>
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Превью выбранных файлов */}
      {previewUrls.length > 0 && (
        <div className={styles.previewContainer}>
          <h3 className={styles.previewTitle}>Выбранные файлы:</h3>
          <div className={styles.previewList}>
            {previewUrls.map((preview, index) => (
              <div key={index} className={styles.previewItem}>
                <div className={styles.previewContent}>
                  {preview.type === 'image' && (
                    <img src={preview.url} alt={preview.name} className={styles.imagePreview} />
                  )}
                  {preview.type === 'video' && (
                    <video 
                      src={preview.url} 
                      className={styles.videoPreview} 
                      controls={false} 
                      muted
                    />
                  )}
                  {(preview.type === 'text' || preview.type === 'unknown') && (
                    <div className={styles.fileIcon}>
                      {preview.type === 'text' ? 'TXT' : '?'}
                    </div>
                  )}
                </div>
                <div className={styles.previewInfo}>
                  <span className={styles.fileName}>{preview.name}</span>
                  <button 
                    className={styles.removeButton} 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 