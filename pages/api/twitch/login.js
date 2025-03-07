// Эндпоинт для авторизации через Twitch
export default function handler(req, res) {
  try {
    // Получаем параметры для авторизации
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitch/callback`;
    
    // Логируем переменные окружения для отладки
    console.log('NEXT_PUBLIC_TWITCH_CLIENT_ID:', clientId ? 'Установлен' : 'Не установлен');
    console.log('NEXT_PUBLIC_TWITCH_REDIRECT_URI:', process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || 'Не установлен');
    console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL || 'Не установлен');
    console.log('Итоговый redirectUri:', redirectUri);
    
    // Проверяем наличие необходимых параметров
    if (!clientId) {
      console.error('Отсутствует NEXT_PUBLIC_TWITCH_CLIENT_ID в переменных окружения');
      return res.status(500).json({ error: 'Ошибка конфигурации сервера', details: 'Отсутствует NEXT_PUBLIC_TWITCH_CLIENT_ID' });
    }
    
    if (!redirectUri) {
      console.error('Отсутствует NEXT_PUBLIC_TWITCH_REDIRECT_URI в переменных окружения');
      return res.status(500).json({ error: 'Ошибка конфигурации сервера', details: 'Отсутствует NEXT_PUBLIC_TWITCH_REDIRECT_URI' });
    }
    
    // Получаем текущий домен из заголовка Host или Referer
    const host = req.headers.host;
    const referer = req.headers.referer;
    const origin = req.headers.origin;
    
    console.log('Заголовки запроса:', {
      host,
      referer,
      origin
    });
    
    // Формируем URL для авторизации
    const scope = 'user:read:email user:read:follows';
    const responseType = 'code';
    const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
    
    // Добавляем параметры
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', responseType);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('force_verify', 'true'); // Всегда запрашивать подтверждение
    
    // Добавляем состояние для защиты от CSRF
    const state = Math.random().toString(36).substring(2, 15);
    authUrl.searchParams.append('state', state);
    
    // Сохраняем состояние в куки для проверки при возврате
    // Используем SameSite=None и Secure для поддержки мобильных устройств
    const isSecure = process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https';
    const sameSite = isSecure ? 'None' : 'Lax';
    const securePart = isSecure ? '; Secure' : '';
    
    res.setHeader('Set-Cookie', `twitch_auth_state=${state}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=3600${securePart}`);
    
    // Логируем URL для отладки
    console.log('Redirecting to Twitch auth URL:', authUrl.toString());
    console.log('Cookie settings:', { sameSite, isSecure });
    
    // Перенаправляем пользователя на страницу авторизации Twitch
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('Ошибка при авторизации через Twitch:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 