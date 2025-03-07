import { setCookie } from '../../../utils/cookies';

export default async function handler(req, res) {
  console.log('Pages Router: Callback запрос начался:', new Date().toISOString());
  
  // Получаем параметры запроса
  const { code, state } = req.query;
  
  // Проверяем наличие параметров
  if (!code) {
    console.error('Отсутствует код авторизации');
    return res.redirect(`/auth?error=missing_code&message=${encodeURIComponent('Отсутствует код авторизации от Twitch')}`);
  }
  
  if (!state) {
    console.error('Отсутствует параметр state');
    return res.redirect(`/auth?error=missing_state&message=${encodeURIComponent('Отсутствует параметр state')}`);
  }
  
  // Получаем state из cookie
  const storedState = req.cookies.twitch_state;
  
  // Проверяем совпадение state для защиты от CSRF
  if (!storedState || state !== storedState) {
    console.error('Несоответствие state:', { providedState: state, storedState });
    return res.redirect(`/auth?error=invalid_state&message=${encodeURIComponent('Недействительный параметр state')}`);
  }
  
  try {
    // Проверяем конфигурацию
    if (!process.env.TWITCH_CLIENT_ID) {
      throw new Error('Отсутствует TWITCH_CLIENT_ID в переменных окружения');
    }
    
    if (!process.env.TWITCH_CLIENT_SECRET) {
      throw new Error('Отсутствует TWITCH_CLIENT_SECRET в переменных окружения');
    }
    
    if (!process.env.TWITCH_REDIRECT_URI) {
      throw new Error('Отсутствует TWITCH_REDIRECT_URI в переменных окружения');
    }
    
    // Получаем токен доступа
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TWITCH_REDIRECT_URI,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Ошибка получения токена:', errorData);
      throw new Error(`Ошибка получения токена: ${errorData.message || tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Токен успешно получен');
    
    // Получаем данные пользователя
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
      },
    });
    
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error('Ошибка получения данных пользователя:', errorData);
      throw new Error(`Ошибка получения данных пользователя: ${errorData.message || userResponse.statusText}`);
    }
    
    const userData = await userResponse.json();
    const user = userData.data[0];
    console.log('Данные пользователя получены:', user.login);
    
    // Устанавливаем заголовки для куков
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Устанавливаем cookies с токенами
    res.setHeader('Set-Cookie', [
      `twitch_access_token=${tokenData.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${tokenData.expires_in}`,
      `twitch_refresh_token=${tokenData.refresh_token}; Path=/; HttpOnly; SameSite=Lax`,
      `twitch_user=${JSON.stringify({
        id: user.id,
        login: user.login,
        display_name: user.display_name,
        profile_image_url: user.profile_image_url,
      })}; Path=/; SameSite=Lax; Max-Age=${tokenData.expires_in}`
    ]);
    
    // Удаляем временную cookie state
    res.setHeader('Set-Cookie', `twitch_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
    
    console.log('Pages Router: Callback успешно завершен, перенаправление на /profile');
    return res.redirect('/profile');
    
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    return res.redirect(
      `/auth?error=auth_error&message=${encodeURIComponent(error.message || 'Произошла ошибка при авторизации через Twitch')}`
    );
  }
} 