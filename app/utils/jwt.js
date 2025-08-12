import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '../utils/supabase/admin';

// Универсальная верификация JWT от Supabase.
// 1) Пытаемся проверить локально с секретом (HS256)
// 2) Если секрета нет или проверка упала — валидируем через Supabase Admin API и возвращаем эквивалент payload
export async function verifyJwt(token) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || '';

  if (!supabaseUrl) {
    console.error('[Utils/jwt] Critical Error: Supabase URL is missing!');
    return null;
  }

  if (!token) {
    console.warn('[verifyJwt] Токен не предоставлен.');
    return null;
  }

  // Попытка локальной проверки
  if (JWT_SECRET && JWT_SECRET.trim() !== '') {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });
      return payload;
    } catch (error) {
      console.warn('[verifyJwt] Локальная проверка JWT не удалась, пробую через Supabase Admin:', error.message);
    }
  } else {
    console.warn('[verifyJwt] JWT secret отсутствует, пробую верификацию через Supabase Admin.');
  }

  // Фоллбэк через Supabase Admin
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      console.error('[verifyJwt] Supabase Admin верификация не удалась:', error?.message || 'user is null');
      return null;
    }
    // Попробуем декодировать payload токена, чтобы достать provider_token (после того как мы уже верифицировали токен у Supabase)
    let decodedPayload = {};
    try {
      const [, payloadB64] = token.split('.');
      if (payloadB64) {
        const json = Buffer.from(payloadB64, 'base64').toString('utf-8');
        decodedPayload = JSON.parse(json);
      }
    } catch {}

    return {
      sub: user.id,
      email: user.email,
      user_metadata: user.user_metadata || decodedPayload.user_metadata || {},
      provider_token: decodedPayload.provider_token || decodedPayload.user_metadata?.provider_token,
    };
  } catch (e) {
    console.error('[verifyJwt] Критическая ошибка Supabase Admin верификации:', e.message);
    return null;
  }
}