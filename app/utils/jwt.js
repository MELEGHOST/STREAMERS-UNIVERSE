import { jwtVerify } from 'jose';
// import { createPublicKey } from 'crypto'; // НЕ ИСПОЛЬЗУЕТСЯ

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!supabaseUrl) {
    console.error("[Utils/jwt] Critical Error: Supabase URL is missing!");
}
if (!JWT_SECRET) {
    console.error("[Utils/jwt] Critical Error: JWT_SECRET is missing!");
}

// Функция для получения публичного ключа из секрета
// Supabase использует HS256, поэтому нам нужен сам секрет, а не публичный ключ.
// Оставляем асинхронную структуру на случай, если Supabase перейдет на асимметричные алгоритмы.
async function getPublicKey() {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET не установлен в переменных окружения.');
    }
    // Для HS256 используем TextEncoder для преобразования секрета в Uint8Array
    return new TextEncoder().encode(JWT_SECRET);
}

export async function verifyJwt(token) {
    if (!token) {
        console.warn('[verifyJwt] Токен не предоставлен.');
        return null;
    }
    if (!JWT_SECRET) {
        console.error('[verifyJwt] JWT_SECRET не установлен, верификация невозможна.');
        return null; // Не можем верифицировать без секрета
    }

    try {
        const secret = await getPublicKey();
        const { payload } = await jwtVerify(token, secret, {
            algorithms: ['HS256'],
        });
        // console.log('[verifyJwt] Токен успешно верифицирован, payload:', payload);
        return payload; // Возвращаем payload при успехе
    } catch (error) {
        console.error('[verifyJwt] Ошибка верификации токена:', error.message);
        return null; // Возвращаем null при ошибке верификации
    }
} 