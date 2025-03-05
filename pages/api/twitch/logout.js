import { serialize } from 'cookie';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Clear cookies correctly in API routes
    res.setHeader('Set-Cookie', [
      serialize('twitch_access_token', '', {
        maxAge: -1,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      }),
      serialize('twitch_refresh_token', '', {
        maxAge: -1,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      }),
      serialize('twitch_expires_at', '', {
        maxAge: -1,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })
    ]);
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
