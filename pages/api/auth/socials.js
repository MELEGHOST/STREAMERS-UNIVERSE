import { Pool } from '@vercel/postgres';
import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from '../auth/[...nextauth]'; // Убедимся, что путь корректен

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, getAuthOptions());
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const userId = session.user.id; // Предполагаем, что в сессии есть user.id
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  try {
    if (req.method === 'GET') {
      // Получаем социальные ссылки из базы данных
      const result = await pool.query(
        'SELECT social_links FROM user_socials WHERE user_id = $1',
        [userId]
      );
      const socialLinks = result.rows[0]?.social_links || {};
      res.status(200).json(socialLinks);
    } else if (req.method === 'POST') {
      const { socialLinks } = req.body;
      // Сохраняем социальные ссылки в базу данных
      await pool.query(
        'INSERT INTO user_socials (user_id, social_links) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET social_links = $2',
        [userId, socialLinks]
      );
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
