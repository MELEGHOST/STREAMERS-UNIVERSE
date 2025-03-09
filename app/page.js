import { redirect } from 'next/navigation';

export default function Home() {
  // Перенаправляем на страницу меню в App Router
  redirect('/menu');
}