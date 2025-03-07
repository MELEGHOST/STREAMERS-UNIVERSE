// Обработчик обратного вызова от Twitch после авторизации
export default async function handler(req, res) {
  try {
    // Получаем код авторизации и состояние из запроса
    const { code, state, error, error_description } = req.query;
    
    // Проверяем наличие ошибки от Twitch
    if (error) {
      console.error('Ошибка авторизации Twitch:', error, error_description);
      return res.redirect(`/auth?error=${encodeURIComponent(error)}&message=${encodeURIComponent(error_description || 'Ошибка авторизации')}`);
    }
    
    // Проверяем наличие кода авторизации
    if (!code) {
      console.error('Отсутствует код авторизации в ответе Twitch');
      return res.redirect('/auth?error=no_code&message=Не получен код авторизации от Twitch');
    }
    
    // Получаем состояние из куки для проверки
    const cookieState = req.cookies.twitch_auth_state;
    
    // Проверяем соответствие состояния для защиты от CSRF
    if (cookieState && state !== cookieState) {
      console.error('Несоответствие состояния при авторизации Twitch');
      return res.redirect('/auth?error=state_mismatch&message=Ошибка безопасности при авторизации');
    }
    
    // Получаем параметры для обмена кода на токен
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitch/callback`;
    
    // Проверяем наличие необходимых параметров
    if (!clientId || !clientSecret) {
      console.error('Отсутствуют необходимые параметры в переменных окружения');
      return res.redirect('/auth?error=config_error&message=Ошибка конфигурации сервера');
    }
    
    // Формируем запрос для обмена кода на токен
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    
    // Проверяем успешность запроса
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Ошибка получения токена от Twitch:', tokenResponse.status, errorData);
      return res.redirect(`/auth?error=token_error&message=Ошибка получения токена (${tokenResponse.status})`);
    }
    
    // Получаем данные токена
    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    
    // Проверяем наличие токена доступа
    if (!access_token) {
      console.error('Отсутствует токен доступа в ответе Twitch');
      return res.redirect('/auth?error=no_token&message=Не получен токен доступа от Twitch');
    }
    
    // Получаем данные пользователя с использованием токена
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-ID': clientId,
      },
    });
    
    // Проверяем успешность запроса
    if (!userResponse.ok) {
      console.error('Ошибка получения данных пользователя от Twitch:', userResponse.status);
      return res.redirect(`/auth?error=user_error&message=Ошибка получения данных пользователя (${userResponse.status})`);
    }
    
    // Получаем данные пользователя
    const userData = await userResponse.json();
    
    // Проверяем наличие данных пользователя
    if (!userData.data || userData.data.length === 0) {
      console.error('Отсутствуют данные пользователя в ответе Twitch');
      return res.redirect('/auth?error=no_user_data&message=Не получены данные пользователя от Twitch');
    }
    
    const user = userData.data[0];
    
    // Получаем подписчиков пользователя
    const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-ID': clientId,
      },
    });
    
    let followersCount = 0;
    let followers = [];
    
    if (followersResponse.ok) {
      const followersData = await followersResponse.json();
      followersCount = followersData.total || 0;
      followers = followersData.data.map(f => f.from_name);
    }
    
    // Получаем подписки пользователя
    const followingsResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-ID': clientId,
      },
    });
    
    let followingsCount = 0;
    let followings = [];
    
    if (followingsResponse.ok) {
      const followingsData = await followingsResponse.json();
      followingsCount = followingsData.total || 0;
      followings = followingsData.data.map(f => f.to_name);
    }
    
    // Определяем статус стримера (150+ подписчиков)
    const isStreamer = followersCount >= 150;
    
    // Формируем данные профиля
    const profileData = {
      twitchName: user.display_name,
      followersCount,
      followers,
      followingsCount,
      followings,
      id: user.id,
      profileImageUrl: user.profile_image_url,
      isStreamer
    };
    
    // Устанавливаем куки с токенами и данными пользователя
    // Используем HttpOnly для токенов для безопасности
    res.setHeader('Set-Cookie', [
      `twitch_access_token=${access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expires_in}`,
      `twitch_refresh_token=${refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`, // 1 год
    ]);
    
    // Перенаправляем на страницу меню с данными пользователя
    return res.redirect('/menu');
  } catch (error) {
    console.error('Ошибка при обработке обратного вызова от Twitch:', error);
    return res.redirect(`/auth?error=server_error&message=${encodeURIComponent(error.message || 'Внутренняя ошибка сервера')}`);
  }
} 