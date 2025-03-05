import axios from 'axios';
import { cookies } from 'next/headers';

export async function GET(req) {
  try {
    // Server-side context check not needed in Route Handlers
    const url = new URL(req.url);
    const { searchParams } = url;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Handle error response from Twitch
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (error) {
      console.error(`Twitch auth error: ${error} - ${errorDescription}`);
      return new Response(JSON.stringify({ error, description: errorDescription }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use environment variable for redirect URI to ensure consistency
    const redirectUri = process.env.TWITCH_REDIRECT_URI;
    
    // Fix: Use URLSearchParams for form-urlencoded data
    const params = new URLSearchParams();
    params.append('client_id', process.env.TWITCH_CLIENT_ID);
    params.append('client_secret', process.env.TWITCH_CLIENT_SECRET);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirectUri);
    
    const tokenResponse = await axios.post(
      'https://id.twitch.tv/oauth2/token', 
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = Date.now() + (expires_in * 1000);

    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
      },
    });
    
    const user = userResponse.data.data[0];
    const userData = {
      id: user.id,
      isStreamer: false, // Logic to determine streamer status
    };

    // Set cookies using next/headers
    const cookieStore = cookies();
    cookieStore.set('twitch_access_token', access_token, { 
      httpOnly: true, 
      secure: true, 
      maxAge: expires_in 
    });
    cookieStore.set('twitch_refresh_token', refresh_token, { 
      httpOnly: true, 
      secure: true, 
      maxAge: 30 * 24 * 60 * 60 
    });
    cookieStore.set('twitch_expires_at', expiresAt.toString(), { 
      httpOnly: true, 
      secure: true, 
      maxAge: expires_in 
    });

    return new Response(null, {
      status: 302,
      headers: { Location: `/profile?user=${encodeURIComponent(JSON.stringify(userData))}` },
    });
  } catch (error) {
    console.error('Twitch callback error:', error);
    return new Response(JSON.stringify({ error: 'Server error', message: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
