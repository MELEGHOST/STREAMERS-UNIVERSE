import axios from 'axios';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;
  if (!code) {
    console.error('Twitch callback: No code provided in query');
    return res.status(400).json({ error: 'No code provided' });
  }

  console.log('Twitch callback: Received code:', code, 'Redirect URI:', process.env.TWITCH_REDIRECT_URI);
  try {
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET || !process.env.TWITCH_REDIRECT_URI) {
      throw new Error('Missing Twitch environment variables');
    }

    // Получаем токен от Twitch
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TWITCH_REDIRECT_URI,
    });

    console.log('Twitch callback: Token response:', tokenResponse.data);
    const token = tokenResponse.data.access_token;

    // Получаем данные пользователя
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Twitch callback: User response:', userResponse.data);
    const user = userResponse.data.data[0];

    // Save session data
    const session = await getServerSession(req, res, authOptions);
    
    // Set cookie with auth data for client-side use
    const userData = JSON.stringify(user);
    res.setHeader('Set-Cookie', [
      `twitchToken=${token}; Path=/; HttpOnly; SameSite=Strict`,
      `twitchUser=${userData}; Path=/; HttpOnly; SameSite=Strict`
    ]);

    // Redirect to profile page
    res.redirect('/profile');
  } catch (error) {
    console.error('Twitch callback error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Twitch: ' + (error.response?.data?.message || error.message) });
  }
}
