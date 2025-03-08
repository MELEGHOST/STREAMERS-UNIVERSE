import Cookies from 'cookies';

export default async function handler(req, res) {
  // Разрешаем только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем код авторизации из параметров запроса
    const { code, error, error_description } = req.query;
    
    // Если есть ошибка, перенаправляем на страницу авторизации с сообщением об ошибке
    if (error) {
      console.error('Twitch auth error:', error, error_description);
      return res.redirect(`/auth?error=${encodeURIComponent(error)}&message=${encodeURIComponent(error_description || 'Unknown error')}`);
    }
    
    // Если нет кода, перенаправляем на страницу авторизации
    if (!code) {
      console.error('No authorization code received from Twitch');
      return res.redirect('/auth?error=no_code&message=No authorization code received from Twitch');
    }
    
    // Получаем токен доступа от Twitch
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/twitch/callback`,
      }),
    });
    
    if (!tokenResponse.ok) {
      console.error('Failed to get access token from Twitch:', await tokenResponse.text());
      return res.redirect('/auth?error=token_error&message=Failed to get access token from Twitch');
    }
    
    const tokenData = await tokenResponse.json();
    
    // Получаем данные пользователя
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!userResponse.ok) {
      console.error('Failed to get user data from Twitch:', await userResponse.text());
      return res.redirect('/auth?error=user_error&message=Failed to get user data from Twitch');
    }
    
    const userData = await userResponse.json();
    
    if (!userData.data || userData.data.length === 0) {
      console.error('No user data received from Twitch');
      return res.redirect('/auth?error=no_user&message=No user data received from Twitch');
    }
    
    const user = userData.data[0];
    
    // Устанавливаем cookies
    const cookies = new Cookies(req, res);
    
    // Устанавливаем токен доступа в cookies
    cookies.set('twitch_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in * 1000, // Время жизни токена в миллисекундах
    });
    
    // Устанавливаем refresh токен в cookies
    cookies.set('twitch_refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    });
    
    // Устанавливаем данные пользователя в cookies
    cookies.set('twitch_user', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in * 1000, // Время жизни токена в миллисекундах
    });
    
    // Перенаправляем на страницу меню
    return res.redirect('/menu');
  } catch (error) {
    console.error('Error in callback API:', error);
    return res.redirect(`/auth?error=server_error&message=${encodeURIComponent(error.message || 'Internal server error')}`);
  }
} 