// utils/securityUtils.js

// Функция для экранирования HTML-тегов
export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Функция для очистки объекта от потенциально опасных данных
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        result[key] = escapeHtml(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

// Функция для валидации URL
export function isValidUrl(url) {
  if (!url || url === '') return true; // Пустая строка допустима
  
  try {
    const parsedUrl = new URL(url);
    // Разрешаем только http и https протоколы
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
} 