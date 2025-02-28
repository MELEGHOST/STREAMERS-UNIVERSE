export default async function handler(req, res) {
  try {
    // Здесь должна быть логика проверки токена (например, через Twitch API или сессии)
    const user = req.session?.user || null; // Предполагаем, что сессия хранит пользователя

    if (!user) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Ошибка /api/auth/me:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}
