import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '../../utils/jwt.js'; // Указываем расширение .js
// import { createClient } from '@supabase/supabase-js'; // Пока не нужно для заглушки

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
// const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

// Заглушка данных:
const allAchievements = [
   { id: 'first_stream', name: 'Первый стрим', description: 'Провести первую трансляцию.', icon: '🚀', condition: 'Провести трансляцию', type: 'streamer' },
   { id: 'follower_goal_10', name: '10 Фолловеров', description: 'Собрать 10 фолловеров на Twitch.', icon: '👥', condition: '10+ фолловеров', type: 'streamer' },
   { id: 'watch_time_1h', name: 'Час в эфире', description: 'Набрать 1 час просмотра ваших трансляций.', icon: '⏱️', condition: '1 час просмотра', type: 'streamer' },
   { id: 'first_review', name: 'Первый отзыв', description: 'Написать свой первый отзыв.', icon: '✍️', condition: 'Написать отзыв', type: 'user' },
   { id: 'affiliate_status', name: 'Компаньон Twitch', description: 'Получить статус компаньона на Twitch.', icon: '🤝', condition: 'Статус компаньона', type: 'streamer' },
   { id: 'watch_10_hours', name: 'Смотрящий', description: 'Просмотреть 10 часов трансляций.', icon: '👀', condition: 'Смотреть 10ч', type: 'user' },
];

// Заглушка: какие ачивки у конкретного пользователя "разблокированы"
// В реальном API это будет запрос к таблице user_achievements
const getUserUnlockedAchievements = async (userId) => {
    // Имитация запроса
    console.log(`[API /achievements] Заглушка: Имитация получения ачивок для user: ${userId}`)
    if (userId === 'user-id-example-1') { // Пример
         return ['first_stream', 'first_review'];
    } else {
        return ['first_stream']; // Дефолтные для других
    }
};

export async function GET(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub;

    try {
        // Получаем список ID разблокированных ачивок (из заглушки)
        const unlockedIds = await getUserUnlockedAchievements(userId);

        // Возвращаем полный список ачивок и ID разблокированных
        const responseData = {
            allAchievements: allAchievements,
            unlockedAchievementIds: unlockedIds
        };

        console.log(`[API /achievements] Заглушка: Отправляем данные для user: ${userId}`);
        return NextResponse.json(responseData, { status: 200 });

    } catch (error) {
        console.error("[API /achievements] Заглушка: Ошибка:", error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
} 