import { createPool } from '@vercel/postgres';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Proper cookie parsing in API routes
    const cookies = parse(req.headers.cookie || '');
    const accessToken = cookies.twitch_access_token;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get userId via Twitch API (assuming token is valid)
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        return res.status(401).json({ error: 'Authentication token expired' });
      }
      throw new Error(`Failed to get user: ${userResponse.status}`);
    }
    
    const userData = await userResponse.json();
    const userId = userData.data[0].id;

    const pool = createPool({ connectionString: process.env.POSTGRES_URL });
    
    if (req.method === 'GET') {
      const result = await pool.query('SELECT social_links FROM user_socials WHERE user_id = $1', [userId]);
      const socialLinks = result.rows[0]?.social_links || {
        description: '',
        twitch: '',
        youtube: '',
        discord: '',
        telegram: '',
        vk: '',
        yandexMusic: '',
        isMusician: false
      };
      res.status(200).json(socialLinks);
    } else if (req.method === 'POST') {
      const { socialLinks } = req.body;
      await pool.query(
        'INSERT INTO user_socials (user_id, social_links) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET social_links = $2',
        [userId, socialLinks]
      );
      res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Socials API error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
