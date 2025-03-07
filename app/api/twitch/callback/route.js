import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Исправлено с next/cookies на next/headers

export async function GET(request) {
  console.log('Callback запрос начался:', new Date().toISOString());
  
  // Получаем URL и параметры запроса
  const url = new URL(request.url);
  console.log('Callback URL:', url.toString());
  
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  console.log('Параметры запроса:', { code: code ? 'присутствует' : 'отсутствует', state: state ? 'присутствует' : 'отсутствует' });
  
  // Проверяем наличие параметров
  if (!code) {
    console.error('Отсутствует код авторизации');
    return NextResponse.redirect(`${url.origin}/auth?error=missing_code&message=${encodeURIComponent('Отсутствует код авторизации от Twitch')}`);
  }
  
  if (!state) {
    console.error('Отсутствует параметр state');
    return NextResponse.redirect(`${url.origin}/auth?error=missing_state&message=${encodeURIComponent('Отсутствует параметр state')}`);
  }
  
  // Получаем state из cookie
  const cookieStore = cookies();
  const storedState = cookieStore.get('twitch_state')?.value;
  
  console.log('Сравнение state:', { providedState: state, storedState });
  
  // Проверяем совпадение state для защиты от CSRF
  if (!storedState || state !== storedState) {
    console.error('Несоответствие state:', { providedState: state, storedState });
    return NextResponse.redirect(`${url.origin}/auth?error=invalid_state&message=${encodeURIComponent('Недействительный параметр state')}`);
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
    
    // Используем TWITCH_REDIRECT_URI как есть, без модификаций
    const redirectUri = process.env.TWITCH_REDIRECT_URI;
    console.log('Используем redirect_uri для получения токена:', redirectUri);
    
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
        redirect_uri: redirectUri,
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
    
    // Создаем redirect с установкой cookies
    const response = NextResponse.redirect(`${url.origin}/profile`);
    
    // Добавляем заголовки для разрешения куков
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', url.origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Устанавливаем cookies с токенами
    response.cookies.set('twitch_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: tokenData.expires_in,
      path: '/',
    });
    
    response.cookies.set('twitch_refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      // Без maxAge, чтобы cookie была сессионной
      path: '/',
    });
    
    // Сохраняем минимум данных пользователя в доступном для клиента cookie
    const profileData = {
      id: user.id,
      login: user.login,
      display_name: user.display_name,
      profile_image_url: user.profile_image_url,
    };
    
    response.cookies.set('twitch_user', JSON.stringify(profileData), {
      httpOnly: false, // Доступно для JS на клиенте
      secure: false,
      sameSite: 'lax',
      maxAge: tokenData.expires_in,
      path: '/',
    });
    
    // Также добавляем данные пользователя в URL для резервного варианта
    const redirectUrl = new URL(`${url.origin}/profile`);
    redirectUrl.searchParams.set('user', JSON.stringify(profileData));
    
    // Удаляем временную cookie state
    response.cookies.delete('twitch_state');
    
    console.log('Callback успешно завершен, перенаправление на /profile с данными пользователя');
    console.log('Redirect URL:', redirectUrl.toString());
    
    // Сохраняем данные пользователя в localStorage через скрипт
    const script = `
      <script>
        try {
          // Сохраняем данные пользователя
          localStorage.setItem('twitch_user', '${JSON.stringify(profileData).replace(/'/g, "\\'")}');
          
          // Сохраняем токены как резервные копии
          localStorage.setItem('cookie_twitch_access_token', '${tokenData.access_token.replace(/'/g, "\\'")}');
          localStorage.setItem('cookie_twitch_refresh_token', '${tokenData.refresh_token.replace(/'/g, "\\'")}');
          localStorage.setItem('cookie_twitch_user', '${JSON.stringify(profileData).replace(/'/g, "\\'")}');
          
          console.log('Данные пользователя сохранены в localStorage');
          
          // Добавляем проверку куков перед редиректом
          const checkCookies = () => {
            const hasCookie = document.cookie.split(';').some(item => item.trim().startsWith('twitch_user='));
            console.log('Проверка наличия куки twitch_user:', hasCookie ? 'найдена' : 'не найдена');
            return hasCookie;
          };
          
          // Если куки не установлены, пытаемся установить их через JavaScript
          if (!checkCookies()) {
            console.log('Куки не обнаружены, пытаемся установить через JavaScript');
            try {
              document.cookie = "twitch_user=" + encodeURIComponent(JSON.stringify(profileData)) + 
                "; path=/; max-age=" + ${tokenData.expires_in} + 
                "; samesite=lax" + 
                (window.location.protocol === 'https:' ? '; secure' : '');
            } catch (e) {
              console.error('Ошибка при установке куки через JavaScript:', e);
            }
          }
          
          window.location.href = '${redirectUrl.toString()}';
        } catch (e) {
          console.error('Ошибка при сохранении данных в localStorage:', e);
          window.location.href = '${redirectUrl.toString()}';
        }
      </script>
    `;
    
    // Возвращаем HTML с скриптом для сохранения данных в localStorage
    return new NextResponse(script, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': url.origin,
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
      },
    });
    
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    return NextResponse.redirect(
      `${url.origin}/auth?error=auth_error&message=${encodeURIComponent(error.message || 'Произошла ошибка при авторизации через Twitch')}`
    );
  }
}
