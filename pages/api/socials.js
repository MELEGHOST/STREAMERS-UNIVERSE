import { parse } from 'cookie';

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  try {
    // Используем cookies для хранения данных
    if (req.method === 'GET') {
      // Получаем cookies из заголовка
      const cookies = parse(req.headers.cookie || '');
      const socialLinks = cookies[`socialLinks_${userId}`] ? JSON.parse(cookies[`socialLinks_${userId}`]) : {};
      res.status(200).json(socialLinks);
    } else if (req.method === 'POST') {
      const { socialLinks } = req.body;
      if (!socialLinks) {
        return res.status(400).json({ error: 'Social links data required' });
      }
      
      // Сохраняем данные в cookies (с 30-дневным сроком действия)
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
