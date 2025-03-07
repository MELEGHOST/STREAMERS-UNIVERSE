import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    const accessToken = Cookies.get('twitch_access_token');
    
    if (accessToken) {
      // Если пользователь авторизован, перенаправляем на страницу меню
      router.push('/menu');
    } else {
      // Если пользователь не авторизован, перенаправляем на страницу авторизации
      router.push('/auth');
    }
  }, [router]);

  return null; // Ничего не рендерим, сразу редиректим
}
