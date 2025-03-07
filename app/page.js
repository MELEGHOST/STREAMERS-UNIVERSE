import { redirect } from 'next/navigation';

export default function Home() {
  // Перенаправляем на страницу меню или авторизации
  redirect('/menu');
} 