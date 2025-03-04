import { signIn } from 'next-auth/next';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.host}`;
    const callbackUrl = '/profile';
    return res.redirect(`/api/auth/signin/twitch?callbackUrl=${encodeURIComponent(`${baseUrl}${callbackUrl}`)}`);
  } catch (error) {
    console.error('Twitch sign-in error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
