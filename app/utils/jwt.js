import { jwtVerify } from 'jose';
// import { createPublicKey } from 'crypto'; // НЕ ИСПОЛЬЗУЕТСЯ

export async function verifyJwt(token) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!supabaseUrl) {
    console.error("[Utils/jwt] Critical Error: Supabase URL is missing!");
    return null;
  }
  if (!JWT_SECRET) {
    console.error("[Utils/jwt] Critical Error: JWT_SECRET is missing!");
    return null;
  }
  if (!token) {
    console.warn('[verifyJwt] Токен не предоставлен.');
    return null;
  }
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    console.error('[verifyJwt] Ошибка верификации токена:', error.message);
    return null;
  }
} 