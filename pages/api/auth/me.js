export default async function handler(req, res) {
  try {
    const user = req.session?.user || null; // Предполагаем сессии через next-auth или кастомную логику
    if (!user) {
      return res.status(401).json({ message: 'Не авторизован' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Ошибка /api/auth/me:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}
