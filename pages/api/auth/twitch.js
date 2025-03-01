import { getServerSession, signIn } from 'next-auth/next';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const baseUrl = `${process.env.NEXTAUTH_URL || `https://${req.headers.host}`}`;
    const callbackUrl = '/profile';
    
    // Используем signIn для редиректа на Twitch OAuth
    await signIn('twitch', { callbackUrl: `${baseUrl}${callbackUrl}`, redirect: true });
  } catch (error) {
    console.error('Twitch sign-in error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
