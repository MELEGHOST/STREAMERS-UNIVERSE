import { jwtVerify } from 'jose';
import { createPublicKey } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const jwtSecret = process.env.JWT_SECRET; // Секрет из переменных окружения

if (!supabaseUrl) {
    console.error("[Utils/jwt] Critical Error: Supabase URL is missing!");
}
if (!jwtSecret) {
    console.error("[Utils/jwt] Critical Error: JWT_SECRET is missing!");
}

// Функция для получения публичного ключа из секрета
// Supabase использует HS256, поэтому нам нужен сам секрет, а не публичный ключ.
// Оставляем асинхронную структуру на случай, если Supabase перейдет на асимметричные алгоритмы.
async function getPublicKey() {
    if (!jwtSecret) {
        throw new Error('JWT_SECRET не установлен в переменных окружения.');
    }
    // Для HS256 используем TextEncoder для преобразования секрета в Uint8Array
    return new TextEncoder().encode(jwtSecret);
}

export async function verifyJwt(token) {
    if (!token) {
        console.warn('[verifyJwt] Токен не предоставлен.');
        return null;
    }
    if (!jwtSecret) {
        console.error('[verifyJwt] JWT_SECRET не установлен, верификация невозможна.');
        return null; // Не можем верифицировать без секрета
    }

    try {
        const publicKey = await getPublicKey();
        const { payload } = await jwtVerify(token, publicKey, {
            // issuer: `https://${new URL(supabaseUrl).hostname}`, // Проверка издателя
            // audience: 'authenticated', // Проверка аудитории
            // Эти проверки могут быть слишком строгими, если токен генерируется не стандартным auth Supabase
        });
        // console.log('[verifyJwt] Токен успешно верифицирован, payload:', payload);
        return payload; // Возвращаем payload при успехе
    } catch (error) {
        console.error('[verifyJwt] Ошибка верификации токена:', error.message);
        return null; // Возвращаем null при ошибке верификации
    }
} 