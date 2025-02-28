import { signIn } from 'next-auth/react';

export default async function handler(req, res) {
  try {
    // Запускаем процесс входа через Twitch
    await signIn('twitch', { callbackUrl: '/profile' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ошибка /api/auth/twitch:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}
