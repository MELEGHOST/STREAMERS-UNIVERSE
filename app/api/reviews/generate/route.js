import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../utils/jwt';
import OpenAI from 'openai'; // Используем openai SDK для OpenRouter
import ytdl from 'ytdl-core'; // Добавляем импорт ytdl-core
import { PassThrough } from 'stream'; // Для работы с потоками
import { validateTwitchUser } from '../../../../utils/twitchApi.js'; // <<< Уточненный относительный путь

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/reviews/generate] Critical Error: Supabase keys missing!");
}
if (!openRouterApiKey) {
    console.error("[API /api/reviews/generate] Critical Error: OPENROUTER_API_KEY missing!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

// Инициализируем клиент OpenAI для OpenRouter
const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: openRouterApiKey,
    // defaultHeaders: { // Опциональные заголовки для OpenRouter
    //     "HTTP-Referer": process.env.NEXT_PUBLIC_BASE_URL, // Your site URL
    //     "X-Title": "Streamers Universe Review Gen", // Your app name
    // },
});

// Функция для получения аудио потока с YouTube
async function getYoutubeAudioStream(url) {
    if (!ytdl.validateURL(url)) {
        throw new Error('Неверная ссылка YouTube.');
    }
    try {
        console.log(`[getYoutubeAudioStream] Getting audio stream for ${url}`);
        const info = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
        if (!format) {
            throw new Error('Не найден подходящий аудиоформат для этого YouTube видео.');
        }
        console.log(`[getYoutubeAudioStream] Chosen format: ${format.mimeType}, ${format.audioBitrate}kbps`);
        const stream = new PassThrough(); 
        ytdl(url, { format: format }).pipe(stream);
        return stream; // Возвращаем поток
    } catch (error) {
        // <<< Логируем полную ошибку ytdl >>>
        console.error(`[getYoutubeAudioStream] Full ytdl error:`, error); 
        // Сохраняем исходное сообщение для проверки статуса
        const originalErrorMessage = error.message || 'Неизвестная ошибка ytdl';
        let userFriendlyMessage = `Ошибка получения аудио с YouTube: ${originalErrorMessage}`;
        // <<< Добавляем проверку на 410 >>>
        if (originalErrorMessage.includes('Status code: 410')) {
             userFriendlyMessage = 'Не удалось получить аудио с YouTube (Ошибка 410). Возможно, видео недоступно в регионе сервера (США), удалено или имеет возрастные/региональные ограничения.';
        }
        throw new Error(userFriendlyMessage); // Выбрасываем новую ошибку
    }
}

// TODO: Функция для получения потока с Twitch Clip (пока заглушка/базовая)
// async function getTwitchClipStream(url) { 
//     // Логика для извлечения ID клипа и получения MP4 URL
//     // Например, через неофициальные API или парсинг
//     // ... Это сложнее и требует исследования ...
//     console.warn("[getTwitchClipStream] Twitch Clip processing is not fully implemented yet.");
//     throw new Error("Обработка Twitch клипов пока не реализована."); 
// }

export async function POST(request) {
    // --- УБИРАЕМ ПРОВЕРКУ АВТОРИЗАЦИИ ДЛЯ ЭТОГО МАРШРУТА ---
    // const token = request.headers.get('Authorization')?.split(' ')[1];
    // const verifiedToken = await verifyJwt(token);
    //
    // if (!verifiedToken) {
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    // const userId = verifiedToken.sub;
    // --------------------------------------------------------

    if (!openRouterApiKey) {
         return NextResponse.json({ error: 'AI Service is not configured.' }, { status: 503 });
    }

    try {
        const body = await request.json();
        // --- ИЗМЕНЕНИЕ: Ожидаем title и category вместо старых полей ---
        const { title, category } = body;

        // Валидация новых полей
        if (!title || !category) {
            console.error("[API /generate] Validation failed: Missing title or category", { title, category });
            return NextResponse.json({ error: 'Missing required fields (title, category)' }, { status: 400 });
        }
        // ------------------------------------------------------------------

        console.log(`[API /generate] Processing AI fill request. Title: ${title}, Category: ${category}`);

        // --- УДАЛЯЕМ ВСЮ ЛОГИКУ ОБРАБОТКИ ФАЙЛОВ/ССЫЛОК/ТРАНСКРИПЦИИ --- 
        // let fileContentText = '';
        // let processingSource = '';
        // let streamSource = null; 
        // let sourceFileName = 'source_file';
        // ... (вся обработка sourceFilePath и sourceUrl удалена)
        // ... (проверка и вызов Whisper удалены)
        // ... (поиск User ID автора по Twitch нику удален)
        // -------------------------------------------------------------

        // --- НОВЫЙ ПРОМПТ для заполнения полей отзыва по названию и категории ---
        const systemPrompt = `You are an AI assistant helping users fill out a review form on "Streamers Universe".
        The user has provided the title of an item and its category.
        Your task is to generate relevant information for the review based *only* on the title and category.
        Provide a plausible, but generic, review text, a rating (1-5), an age rating suggestion (e.g., "18+", "PG-13", "0+", or null if unsure), and potentially relevant genres (for movies/series) or a subcategory (for other categories).
        Also, try to find a relevant image URL for the item using web search knowledge (if possible, otherwise return null).
        
        **Output Format:** Respond ONLY with a valid JSON object with these keys:
        - "text": (string | null) Generated review text (max 500 characters). Be neutral or slightly positive.
        - "rating": (integer | null) A suggested rating (e.g., 3 or 4).
        - "age_rating": (string | null) Suggested age rating (e.g., "18+", "PG-13", "0+").
        - "genres": (array of strings | null) For category "Фильмы" or "Сериалы", suggest 1-3 relevant genres. Use common Russian genre names.
        - "subcategory": (string | null) For other categories, suggest a relevant subcategory.
        - "image_url": (string | null) A URL to a relevant image (poster, cover art, etc.) if found, otherwise null.
        
        Example (Movie):
        {
          "text": "Довольно стандартный боевик с неплохими спецэффектами. Сюжет предсказуем, но смотрится бодро.",
          "rating": 3,
          "age_rating": "16+",
          "genres": ["Боевик", "Триллер"],
          "subcategory": null,
          "image_url": "https://example.com/movie_poster.jpg"
        }
        
        Example (Game):
        {
          "text": "Классическая RPG с глубоким миром и интересными квестами. Графика немного устарела, но геймплей затягивает.",
          "rating": 4,
          "age_rating": "12+",
          "genres": null,
          "subcategory": "RPG",
          "image_url": "https://example.com/game_cover.jpg"
        }

        Example (Music Album):
        {
          "text": "Энергичный рок-альбом с запоминающимися риффами и мощным вокалом. Несколько треков выделяются особенно.",
          "rating": 4,
          "age_rating": null,
          "genres": null,
          "subcategory": "Рок",
          "image_url": "https://example.com/album_cover.jpg"
        }
        
        If you cannot generate plausible information for some fields based on the title/category, return null for those fields.
        DO NOT include explanations or markdown outside the JSON object.`;

        const userPrompt = `Title: ${title}\nCategory: ${category}\n\nPlease generate the review fields JSON.`;
        // --------------------------------------------------------------------------

        console.log(`[API /generate] Sending request to AI for review fill. Title: ${title}, Category: ${category}`);

        // 5. Вызов модели через OpenRouter
        const aiResponse = await openrouter.chat.completions.create({
            model: "google/gemini-pro",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7, // Чуть выше для разнообразия
        });

        console.log('[API /generate] Raw AI Response:', JSON.stringify(aiResponse, null, 2));

        const aiResultString = aiResponse.choices?.[0]?.message?.content?.trim();
        const choiceReason = aiResponse.choices?.[0]?.finish_reason;

        if (!aiResultString) {
            console.error(`[API /generate] AI returned empty or no content. Finish reason: ${choiceReason}.`);
            throw new Error(`AI не вернул контент ответа. Причина завершения: ${choiceReason || 'unknown'}`);
        }
        console.log(`[API /generate] AI response string received (${aiResultString.length} chars). Finish reason: ${choiceReason}. String: "${aiResultString}"`);

        let reviewJson;
        try {
            reviewJson = JSON.parse(aiResultString);
        } catch (parseError) {
            console.error('[API /generate] Failed to parse AI JSON response:', aiResultString);
            throw new Error(`Ошибка парсинга ответа от AI: ${parseError.message}`);
        }

        // --- ИЗМЕНЕНИЕ: Валидация новых полей --- 
        // Проверяем только наличие ключей, значения могут быть null
        const requiredKeys = ["text", "rating", "age_rating", "genres", "subcategory", "image_url"];
        if (!requiredKeys.every(key => key in reviewJson)) {
             console.error('[API /generate] Invalid JSON structure from AI:', reviewJson);
             throw new Error('AI вернул JSON в неверном формате (отсутствуют ключи).');
        }
        // -----------------------------------------

        // --- УДАЛЯЕМ СОХРАНЕНИЕ В БД --- 
        // Результат просто возвращается на фронтенд
        // console.log(`[API /generate] Generated review saved with ID: ${reviewData?.id} ...`);
        // return NextResponse.json({ message: 'Review generated...' ... });
        // --------------------------------

        console.log('[API /generate] Returning generated fields to client.', reviewJson);
        return NextResponse.json(reviewJson, { status: 200 }); // Возвращаем JSON с полями

    } catch (error) {
        // ... (обработчик ошибок остается, но без SyntaxError, т.к. мы его удалили?)
        // if (error instanceof SyntaxError) { ... }
        console.error("[API /generate] Unexpected error in POST handler:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
} 