import { NextResponse } from 'next/server';

export function middleware(request) {
  // Получаем текущий URL
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // Уменьшим количество логов в production среде
  if (process.env.NODE_ENV !== 'production') {
    console.log('Middleware обрабатывает запрос:', pathname);
  }
  
  // Логируем для отладки, если запрос связан с Twitch callback 
  // только в режиме разработки или при ошибках
  if (pathname.startsWith('/api/twitch/callback')) {
    console.log('[Middleware] Обработка Twitch callback', pathname);
    // Логируем только если переменные окружения действительно установлены
    if (process.env.TWITCH_REDIRECT_URI) {
      console.log('[Middleware] TWITCH_REDIRECT_URI:', process.env.TWITCH_REDIRECT_URI);
    } else {
      console.error('[Middleware] TWITCH_REDIRECT_URI не установлен!');
    }
    
    if (process.env.NEXT_PUBLIC_APP_URL) {
      console.log('[Middleware] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    } else {
      console.error('[Middleware] NEXT_PUBLIC_APP_URL не установлен!');
    }
  }
  
  // Пропускаем запросы к API авторизации без изменений
  if (pathname.startsWith('/api/auth') || 
      pathname.startsWith('/api/twitch/login') || 
      pathname.startsWith('/api/twitch/callback') || 
      pathname.startsWith('/api/twitch/token')) {
    // Для запросов авторизации не применяем дополнительных преобразований
    // Это позволяет избежать проблем с CORS и авторизацией
    return;
  }
  
  // Пропускаем запросы к меню без проверки авторизации
  if (pathname === '/menu') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Middleware: пропускаем запрос к меню без проверки авторизации');
    }
    return NextResponse.next();
  }
  
  // Клонируем текущий ответ
  const response = NextResponse.next();
  
  // Безопасное получение значения куки
  const getCookieSafely = (name) => {
    try {
      return request.cookies.get(name)?.value;
    } catch (e) {
      console.error(`Ошибка при получении куки ${name}:`, e);
      return undefined;
    }
  };
  
  // Безопасная установка куки
  const setCookieSafely = (name, value, options = {}) => {
    try {
      response.cookies.set(name, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 день
        ...options
      });
      return true;
    } catch (e) {
      console.error(`Ошибка при установке куки ${name}:`, e);
      return false;
    }
  };
  
  // Генерируем CSRF-токен, если его нет в куках
  const csrfToken = getCookieSafely('csrf_token');
  if (!csrfToken) {
    // Генерируем случайный токен с использованием Web Crypto API вместо Node.js crypto
    const newCsrfToken = generateRandomString(32);
    if (setCookieSafely('csrf_token', newCsrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 день
    })) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Middleware: сгенерирован новый CSRF-токен');
      }
    }
  }
  
  // Добавляем заголовки безопасности
  try {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Устанавливаем CSP только если заголовки можно изменять (совместимость с Edge)
    const cspValue = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.twitch.tv https://*.jtvnw.net; connect-src 'self' https://api.twitch.tv https://id.twitch.tv; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';";
    response.headers.set('Content-Security-Policy', cspValue);
  } catch (e) {
    console.error('Ошибка при установке заголовков безопасности:', e);
  }
  
  // Получаем origin запроса
  const origin = request.headers.get('origin');
  
  // Список разрешенных доменов
  const allowedOrigins = [
    'https://streamers-universe.vercel.app',
    'https://streamers-universe.com',
    'https://streamers-universe-meleghost-meleghosts-projects.vercel.app',
    // Локальные домены для разработки
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Добавьте другие разрешенные домены
  ];
  
  // Проверяем, является ли origin разрешенным
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  // Устанавливаем заголовки CORS только для разрешенных доменов
  try {
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    } else if (origin && process.env.NODE_ENV !== 'production') {
      // Если origin не в списке разрешенных, логируем только в dev режиме
      console.log(`Middleware: Origin ${origin} не разрешен`);
    }
  } catch (e) {
    console.error('Ошибка при установке CORS заголовков:', e);
  }
  
  // Для OPTIONS запросов сразу возвращаем ответ с заголовками CORS
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }
  
  // Если это запрос к API, проверяем наличие куков
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/twitch/login') && !pathname.startsWith('/api/twitch/callback')) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Обработка API запроса в middleware:', pathname);
    }
    
    // Проверяем наличие куков для отладки
    const hasTwitchAccessToken = request.cookies.has('twitch_access_token');
    const hasTwitchUser = request.cookies.has('twitch_user') || request.cookies.has('twitch_user_data');
    
    // Проверяем наличие заголовка Authorization
    const hasAuthHeader = request.headers.has('Authorization');
    const authHeader = request.headers.get('Authorization');
    
    // Проверяем наличие токена в localStorage через куки
    const hasLocalStorageToken = request.cookies.has('has_local_storage_token');
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Middleware: проверка авторизации:', {
        twitch_access_token: hasTwitchAccessToken ? 'присутствует' : 'отсутствует',
        twitch_user: hasTwitchUser ? 'присутствует' : 'отсутствует',
        authorization_header: hasAuthHeader ? 'присутствует' : 'отсутствует',
        auth_header_value: authHeader ? authHeader.substring(0, 15) + '...' : 'отсутствует',
        has_local_storage_token: hasLocalStorageToken ? 'присутствует' : 'отсутствует',
        domain: request.headers.get('host'),
        protocol: request.headers.get('x-forwarded-proto') || 'http'
      });
    }
    
    // Если это запрос к API профиля
    if (pathname === '/api/twitch/profile') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Middleware: обработка запроса к API профиля');
      }
      
      // Если нет ни куки, ни заголовка, перенаправляем на страницу авторизации
      if (!hasTwitchAccessToken && !hasAuthHeader && !hasLocalStorageToken) {
        console.log('Middleware: отсутствует токен доступа и заголовок Authorization, перенаправление на /auth');
        return NextResponse.redirect(new URL('/auth?clear_auth=true', request.url));
      }
      
      // Если есть заголовок Authorization, пропускаем запрос и добавляем заголовок для безопасной передачи токена
      if (hasAuthHeader) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Middleware: обнаружен заголовок Authorization, пропускаем запрос');
        }
        
        // Извлекаем токен из заголовка
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7);
            
            // Добавляем токен в заголовок ответа для безопасной обработки на клиенте
            response.headers.set('X-Auth-Token', token);
            
            // Устанавливаем куку для отслеживания наличия токена
            setCookieSafely('has_auth_header', 'true', {
              maxAge: 60 * 60 * 24 // 1 день
            });
          } catch (e) {
            console.error('Ошибка при обработке заголовка Authorization:', e);
          }
        }
      }
      
      // Добавляем заголовок для указания типа запроса (AJAX или обычный)
      try {
        const isAjaxRequest = request.headers.get('X-Requested-With') === 'XMLHttpRequest' || 
                             request.headers.get('Accept')?.includes('application/json');
        
        if (isAjaxRequest) {
          response.headers.set('X-Request-Type', 'ajax');
        } else {
          response.headers.set('X-Request-Type', 'regular');
        }
      } catch (e) {
        console.error('Ошибка при установке заголовка X-Request-Type:', e);
      }
    }
  }
  
  // Проверяем доступ к защищенным страницам (кроме меню)
  if (pathname === '/profile' || 
      pathname === '/search' || 
      pathname === '/followings' || 
      pathname === '/followers' || 
      pathname === '/questions' || 
      pathname === '/settings') {
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Middleware: проверка доступа к защищенной странице:', pathname);
    }
    
    // Получаем токен доступа и данные пользователя из куков
    const hasTwitchAccessToken = request.cookies.has('twitch_access_token');
    const hasTwitchUser = request.cookies.has('twitch_user');
    const hasTwitchUserData = request.cookies.has('twitch_user_data');
    const hasAuthHeader = request.headers.has('Authorization');
    
    // Проверяем наличие токенов в localStorage через куки
    const hasLocalStorageToken = request.cookies.has('has_local_storage_token');
    
    // Установим куку, указывающую на присутствие данных в localStorage
    // Это поможет при следующих запросах без перезагрузки страницы
    if (hasLocalStorageToken) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Middleware: обнаружен токен в localStorage, пропускаем проверку авторизации');
      }
      return NextResponse.next();
    }
    
    // Если нет ни куки, ни заголовка, перенаправляем на страницу авторизации
    if (!hasTwitchAccessToken && !hasAuthHeader && !hasTwitchUser && !hasTwitchUserData && !hasLocalStorageToken) {
      console.log('Middleware: пользователь не авторизован, перенаправление на /auth');
      return NextResponse.redirect(new URL('/auth?redirect=' + encodeURIComponent(pathname), request.url));
    }
    
    // Если пользователь авторизован, пропускаем запрос
    return NextResponse.next();
  }
  
  return response;
}

// Функция для генерации случайной строки с использованием более безопасного метода
function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  
  try {
    // Проверяем наличие crypto API
    if (typeof crypto !== 'undefined') {
      // Используем Uint32Array для более эффективной генерации случайных чисел
      const values = new Uint32Array(length);
      
      // Заполняем массив случайными значениями
      crypto.getRandomValues(values);
      
      // Преобразуем случайные значения в символы
      for (let i = 0; i < length; i++) {
        // Используем побитовое И для получения индекса в диапазоне [0, charactersLength)
        result += characters.charAt(values[i] % charactersLength);
      }
      
      return result;
    }
  } catch (error) {
    console.error('Ошибка при использовании crypto API:', error);
  }
  
  // Запасной вариант для сред, где crypto API недоступен
  // Не такой безопасный, но все же функциональный
  const secureRandom = () => {
    // Используем текущее время и Math.random для создания более случайного значения
    return (Math.random() * new Date().getTime()) % 1;
  };
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(secureRandom() * charactersLength));
  }
  
  return result;
}

// Указываем, для каких путей применять middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 