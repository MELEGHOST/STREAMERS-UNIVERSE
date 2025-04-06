import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../utils/jwt';
import OpenAI from 'openai'; // Используем openai SDK для OpenRouter

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

export async function POST(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub;

    if (!openRouterApiKey) {
         return NextResponse.json({ error: 'AI Service is not configured.' }, { status: 503 });
    }

    try {
        const body = await request.json();
        const { category, subcategory, itemName, sourceFilePath, authorTwitchId } = body;

        if (!category || !itemName || !sourceFilePath || !authorTwitchId) {
            return NextResponse.json({ error: 'Missing required fields (category, itemName, sourceFilePath, authorTwitchId)' }, { status: 400 });
        }

        console.log(`[API /generate] Processing request for ${itemName}. Source: ${sourceFilePath}`);

        // 1. Скачиваем файл
        console.log(`[API /generate] Downloading file: ${sourceFilePath}`);
        const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
            .from('reviews-sources')
            .download(sourceFilePath);
        
        if (downloadError) throw new Error(`Failed to download source file: ${downloadError.message}`);
        if (!fileBlob) throw new Error('Downloaded file data is empty.');

        // 2. Получаем текст: читаем TXT или транскрибируем аудио/видео
        let fileContentText = '';
        const fileType = fileBlob.type;
        const fileName = sourceFilePath.split('/').pop() || 'unknown_file'; // Получаем имя файла для Whisper

        console.log(`[API /generate] Detected file type: ${fileType}, name: ${fileName}`);

        if (fileType === 'text/plain') {
            console.log(`[API /generate] Reading text content...`);
            fileContentText = await fileBlob.text();
        } else if (fileType.startsWith('audio/') || fileType.startsWith('video/')) {
            console.log(`[API /generate] Sending audio/video to Whisper for transcription...`);
            try {
                // Используем Buffer для передачи в API
                const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
                
                // Создаем ReadableStream из буфера, чтобы имитировать файл для SDK
                // Важно: Передаем буфер напрямую, т.к. SDK может его обработать.
                // Необходимо передать имя файла.
                const transcriptionResponse = await openrouter.audio.transcriptions.create({
                    model: "openai/whisper-1", // Модель Whisper на OpenRouter
                    file: new File([fileBlob], fileName, { type: fileType }), // Передаем Blob как File
                    // language: 'ru', // Можно указать язык, если нужно
                    response_format: 'text' // Получаем просто текст
                });

                // Проверяем, что вернулся текст
                if (typeof transcriptionResponse !== 'string' || !transcriptionResponse.trim()) {
                     console.error('[API /generate] Whisper did not return valid text.', transcriptionResponse);
                     throw new Error('Ошибка транскрипции: Whisper не вернул текст.');
                }
                
                fileContentText = transcriptionResponse.trim();
                console.log(`[API /generate] Whisper transcription successful (${fileContentText.length} chars).`);

            } catch (transcriptionError) {
                console.error('[API /generate] Whisper transcription failed:', transcriptionError);
                throw new Error(`Ошибка транскрипции: ${transcriptionError.message}`);
            }
        } else {
            console.warn(`[API /generate] Unsupported file type: ${fileType}`);
            throw new Error(`Неподдерживаемый тип файла: ${fileType}. Поддерживаются .txt, аудио и видео форматы.`);
        }

        // 3. Ограничение на размер текста для промпта Gemini
        const maxContentLength = 4000;
        const truncatedContent = fileContentText.length > maxContentLength 
            ? fileContentText.substring(0, maxContentLength) + "... [содержимое обрезано]"
            : fileContentText;
        
        if (!truncatedContent) {
             throw new Error('Не удалось получить текстовое содержимое из файла для генерации отзыва.');
        }

        // --- Поиск User ID автора по Twitch ID --- 
        let authorUserId = null;
        try {
            // Ищем в user_profiles по provider_id в метаданных
            // В идеале иметь прямую колонку twitch_id
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .select('user_id')
                .eq('user_metadata->>provider_id', authorTwitchId)
                .maybeSingle();
            
            if (profileError) {
                console.error(`[API Generate Review] Ошибка поиска профиля для authorTwitchId ${authorTwitchId}:`, profileError);
                throw new Error('Database error while searching for author profile.');
            }
            if (!profileData) {
                console.warn(`[API Generate Review] Автор с Twitch ID ${authorTwitchId} не найден в user_profiles.`);
                // Что делать? 
                // 1. Ошибка: return NextResponse.json({ error: `Author with Twitch ID ${authorTwitchId} not found in our system.` }, { status: 404 });
                // 2. Создать отзыв без user_id? (плохо)
                // 3. Создать отзыв на имя запросившего? (тоже не то)
                // Пока вернем ошибку:
                return NextResponse.json({ error: `Автор с Twitch ID ${authorTwitchId} не зарегистрирован в Streamers Universe.` }, { status: 404 });
            }
            authorUserId = profileData.user_id;
            console.log(`[API Generate Review] Найден User ID автора: ${authorUserId} для Twitch ID: ${authorTwitchId}`);

        } catch (dbLookupError) {
            return NextResponse.json({ error: `Failed to find author: ${dbLookupError.message}` }, { status: 500 });
        }
        // -------------------------------------------

        console.log(`[API Generate Review] User ${userId} requested generation for author ${authorUserId} (Twitch: ${authorTwitchId}). Category: ${category}, Item: ${itemName}, Source: ${sourceFilePath}`);

        // 4. Формируем промпт для Gemini (как и раньше)
        const prompt = `Ты - опытный критик и обозреватель. Проанализируй следующий текст (это может быть транскрипт видео, статьи и т.д.) и напиши краткий, но содержательный отзыв (~100-200 слов) на русском языке. Сосредоточься на ключевых моментах, плюсах и минусах, общем впечатлении. Не используй фразы вроде "На основе текста...". Пиши так, будто это твое собственное мнение об объекте '${itemName}'.
Категория: ${category}${subcategory ? `/ ${subcategory}` : ''}

Текст для анализа:
---
${truncatedContent}
---

Напиши только сам текст отзыва.`;

        console.log(`[API /generate] Sending request to OpenRouter (Gemini 2.5 Pro)...`);

        // 5. Выполняем запрос к Gemini
        const response = await openrouter.chat.completions.create({
            model: "google/gemini-2.5-pro-exp-03-25:free",
            messages: [
                { role: "system", content: "Ты - AI ассистент, который пишет краткие отзывы на основе предоставленного текста." },
                { role: "user", content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.7,
        });

        const generatedText = response.choices[0]?.message?.content?.trim();

        if (!generatedText) {
            console.error("[API /generate] Gemini did not return content.", response);
            throw new Error('AI не смог сгенерировать отзыв.');
        }

        console.log(`[API /generate] Gemini generated text (${generatedText.length} chars).`);

        // 6. Сохраняем результат в БД (как и раньше)
        const { data: reviewData, error: insertError } = await supabaseAdmin
            .from('reviews')
            .insert({
                user_id: authorUserId,
                category,
                subcategory: subcategory || null,
                item_name: itemName,
                review_text: generatedText, 
                source_file_path: sourceFilePath,
                status: 'pending' 
            })
            .select('id') 
            .single();

        if (insertError) throw insertError;

        console.log(`[API /generate] Generated review saved with ID: ${reviewData?.id} and status 'pending'.`);
        return NextResponse.json({ message: 'Review generated and submitted for moderation.', reviewId: reviewData?.id }, { status: 201 });

    } catch (error) { // Ловим ошибки из всей логики файла
        console.error(`[API /generate] Error processing request for user ${userId}, source ${sourceFilePath || 'unknown'}:`, error);
        // Возвращаем более конкретную ошибку, если возможно
        let statusCode = 500;
        if (error.message.includes('download')) statusCode = 502;
        if (error.message.includes('transcription')) statusCode = 500; 
        if (error.message.includes('Unsupported file type')) statusCode = 415;
        if (error.message.includes('author')) statusCode = error.status || 500; // Используем статус из ошибки поиска автора
        
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: statusCode });
    }
} 