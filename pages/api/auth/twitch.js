import { getServerSession } from 'next-auth/next';
import { signIn } from 'next-auth/react';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    console.log('Current session before Twitch sign-in:', session); // Отладка

    const baseUrl = `${process.env.NEXTAUTH_URL || `https://${req.headers.host}`}`;
    const callbackUrl = '/profile';
    
    // Редирект на URL авторизации Twitch, так как signIn не может быть вызван на сервере
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
      process.env.TWITCH_CLIENT_ID
    }&redirect_uri=${
      encodeURIComponent(process.env.TWITCH_REDIRECT_URI || `${baseUrl}/api/auth/callback/twitch`)
    }&response_type=code&scope=user:read:email`;
    
    res.redirect(twitchAuthUrl);
  } catch (error) {
    console.error('Twitch sign-in error:', {
      error,
      stack: error.stack,
      method: req.method,
      url: req.url,
    });
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
