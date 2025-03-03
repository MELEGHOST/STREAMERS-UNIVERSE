export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  try {
    // Используем cookies или сессию для хранения данных
    if (req.method === 'GET') {
      // Получаем данные из cookies (пример)
      const socialLinks = req.cookies[`socialLinks_${userId}`] ? JSON.parse(req.cookies[`socialLinks_${userId}`]) : {};
      res.status(200).json(socialLinks);
    } else if (req.method === 'POST') {
      const { socialLinks } = req.body;
      // Сохраняем данные в cookies (пример, с 30-дневным сроком действия)
      res.setHeader('Set-Cookie', [
        `socialLinks_${userId}=${JSON.stringify(socialLinks)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000` // 30 дней
      ]);
      res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Socials API error:', {
      error,
      stack: error.stack,
      method: req.method,
      url: req.url,
    });
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
