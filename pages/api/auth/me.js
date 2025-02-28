export default async function handler(req, res) {
  try {
    // Предполагаем, что сессия или токен проверяются middleware (например, next-auth)
    const user = req.session?.user || null; // Замени на свою логику проверки сессии
    if (!user) {
      return res.status(401).json({ message: 'Не авторизован' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Ошибка /api/auth/me:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}
