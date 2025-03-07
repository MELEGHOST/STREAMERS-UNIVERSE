import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('Обработка запроса на выход из системы');
    
    // Получаем URL для перенаправления после выхода
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get('redirect') || '/';
    
    // Создаем ответ с перенаправлением
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    
    // Получаем хранилище куки
    const cookieStore = cookies();
    
    // Получаем токен доступа для возможного запроса на отзыв
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    // Если есть токен доступа, пытаемся отозвать его на стороне Twitch
    if (accessToken) {
      try {
        const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
        
        // Отзываем токен на стороне Twitch
        const revokeResponse = await fetch('https://id.twitch.tv/oauth2/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            token: accessToken,
          }),
        });
        
        if (revokeResponse.ok) {
          console.log('Токен успешно отозван на стороне Twitch');
        } else {
          console.warn('Не удалось отозвать токен на стороне Twitch:', revokeResponse.status);
        }
      } catch (error) {
        console.error('Ошибка при отзыве токена:', error);
        // Продолжаем процесс выхода даже при ошибке отзыва токена
      }
    }
    
    // Удаляем все куки, связанные с аутентификацией
    response.cookies.delete('twitch_access_token');
    response.cookies.delete('twitch_refresh_token');
    response.cookies.delete('twitch_auth_state');
    
    console.log('Куки аутентификации успешно удалены');
    
    return response;
  } catch (error) {
    console.error('Ошибка при обработке запроса на выход:', error);
    
    // В случае ошибки все равно пытаемся удалить куки и перенаправить пользователя
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('twitch_access_token');
    response.cookies.delete('twitch_refresh_token');
    response.cookies.delete('twitch_auth_state');
    
    return response;
  }
} 