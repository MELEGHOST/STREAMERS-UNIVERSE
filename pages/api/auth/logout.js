import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear cookies
    res.setHeader('Set-Cookie', [
      'twitchToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      'twitchUser=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
    ]);
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout: ' + error.message });
  }
}
