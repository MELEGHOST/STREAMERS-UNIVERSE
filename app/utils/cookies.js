// Функция для проверки валидности токена
export const validateToken = async (token) => {
  if (!token) {
    console.warn('Отсутствует токен для проверки');
    return false;
  }
  
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });
    
    if (!response.ok) {
      console.warn('Токен недействителен:', response.status);
      return false;
    }
    
    try {
      const data = await response.json();
      
      // Проверяем наличие необходимых полей в ответе
      if (!data.client_id || !data.login) {
        console.warn('Ответ валидации токена не содержит необходимых полей');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при парсинге JSON ответа от Twitch API:', error);
      return false;
    }
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return false;
  }
}; 