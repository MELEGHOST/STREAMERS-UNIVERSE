import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../utils/jwt'; // Путь может потребовать корректировки
import OpenAI from 'openai';
import ytdl from 'ytdl-core';
import { PassThrough } from 'stream';
import { validateTwitchUser } from '../../../../utils/twitchApi.js';

// Функция для получения аудио потока с YouTube (та же, что и была)
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
        return stream;
    } catch (error) {
        console.error(`[getYoutubeAudioStream] Full ytdl error:`, error);
        const originalErrorMessage = error.message || 'Неизвестная ошибка ytdl';
        let userFriendlyMessage = `Ошибка получения аудио с YouTube: ${originalErrorMessage}`;
        if (originalErrorMessage.includes('Status code: 410')) {
             userFriendlyMessage = 'Не удалось получить аудио с YouTube (Ошибка 410). Возможно, видео недоступно в регионе сервера (США), удалено или имеет возрастные/региональные ограничения.';
        }
        throw new Error(userFriendlyMessage);
    }
}

// TODO: Функция для Twitch Clip (пока заглушка)
// async function getTwitchClipStream(url) { ... }

export async function POST(request) {
    // Проверки авторизации
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);
    if (!verifiedToken) {
        console.warn("[API /generate-full] Unauthorized access attempt.");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub;

    // Проверки env
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("[API /generate-full] Critical Error: Supabase keys missing!");
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }
    if (!openRouterApiKey) {
        console.error("[API /generate-full] Critical Error: OPENROUTER_API_KEY missing!");
        return NextResponse.json({ error: 'AI Service is not configured.' }, { status: 503 });
    }

    // Инициализация клиентов
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterApiKey,
    });

    try {
        const body = await request.json();
        // --- Ожидаем СТАРЫЕ поля ---
        const { sourceFilePath, sourceUrl, authorTwitchName } = body;

        // Валидация старых полей
        if (!authorTwitchName || (!sourceFilePath && !sourceUrl)) {
            console.error("[API /generate-full] Validation failed: Missing required fields", { authorTwitchName, sourceFilePath, sourceUrl });
            return NextResponse.json({ error: 'Missing required fields (authorTwitchName, and either sourceFilePath or sourceUrl)' }, { status: 400 });
        }
        if (sourceFilePath && sourceUrl) {
             console.error("[API /generate-full] Validation failed: Both sourceFilePath and sourceUrl provided");
              return NextResponse.json({ error: 'Provide either sourceFilePath or sourceUrl, not both.' }, { status: 400 });
        }
        // --------------------------

        console.log(`[API /generate-full] User ${userId} processing request for AI review. Author: ${authorTwitchName}`);

        let fileContentText = '';
        let processingSource = '';
        let streamSource = null;
        let sourceFileName = 'source_file';

        // --- Обработка источника: файл или URL (СТАРАЯ ЛОГИКА) ---
        if (sourceFilePath) {
            processingSource = `file: ${sourceFilePath}`;
            console.log(`[API /generate-full] Processing uploaded file: ${sourceFilePath}`);
            const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
                .from('reviews-sources') // Используем бакет для источников
                .download(sourceFilePath);
            if (downloadError) throw new Error(`Failed to download source file: ${downloadError.message}`);
            if (!fileBlob) throw new Error('Downloaded file data is empty.');

            const fileType = fileBlob.type;
            sourceFileName = sourceFilePath.split('/').pop() || 'uploaded_file';
            console.log(`[API /generate-full] Downloaded file type: ${fileType}, name: ${sourceFileName}`);

            if (fileType === 'text/plain') {
                fileContentText = await fileBlob.text();
            } else if (fileType.startsWith('audio/') || fileType.startsWith('video/')) {
                streamSource = new File([fileBlob], sourceFileName, { type: fileType });
            } else {
                throw new Error(`Неподдерживаемый тип файла: ${fileType}.`);
            }
        } else if (sourceUrl) {
            processingSource = `url: ${sourceUrl}`;
            console.log(`[API /generate-full] Processing URL: ${sourceUrl}`);
            try {
                if (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be')) {
                    sourceFileName = `youtube_${ytdl.getVideoID(sourceUrl)}.mp3`;
                    streamSource = await getYoutubeAudioStream(sourceUrl);
                }
                // else if (sourceUrl.includes('twitch.tv/clip/')) { // TODO
                //     streamSource = await getTwitchClipStream(sourceUrl);
                // }
                 else {
                    throw new Error('Неподдерживаемый URL. Сейчас поддерживаются только ссылки YouTube.');
                }
            } catch (urlProcessingError) {
                console.error(`[API /generate-full] Error processing URL ${sourceUrl}:`, urlProcessingError);
                return NextResponse.json({ error: urlProcessingError.message || 'Ошибка обработки URL источника.' }, { status: 400 });
            }
        }
        // ----------------------------------------------------------

        // --- Транскрипция, если нужен streamSource (СТАРАЯ ЛОГИКА) ---
        if (streamSource) {
             console.log(`[API /generate-full] Sending stream/file '${sourceFileName}' to Whisper...`);
             try {
                const transcriptionResponse = await openrouter.audio.transcriptions.create({
                    model: "openai/whisper-1",
                    file: streamSource,
                });
                if (typeof transcriptionResponse === 'string') {
                     fileContentText = transcriptionResponse.trim();
                } else if (transcriptionResponse && typeof transcriptionResponse.text === 'string') {
                    fileContentText = transcriptionResponse.text.trim();
                } else {
                     console.error('[API /generate-full] Whisper did not return valid text.', transcriptionResponse);
                     throw new Error('Ошибка транскрипции: Whisper не вернул текст.');
                }
                console.log(`[API /generate-full] Whisper transcription successful (${fileContentText.length} chars).`);
            } catch (transcriptionError) {
                console.error('[API /generate-full] Whisper transcription failed:', transcriptionError);
                return NextResponse.json({ error: `Ошибка транскрипции из ${processingSource}: ${transcriptionError.message}` }, { status: 500 });
            }
        } else if (!fileContentText) {
             console.error('[API /generate-full] No stream source and no text content found.');
             return NextResponse.json({ error: 'Не удалось получить контент для генерации (ни текст, ни аудио/видео).' }, { status: 400 });
        }
        // ----------------------------------------------------------

        if (!fileContentText) {
             console.error('[API /generate-full] Text content is empty after processing source.');
             return NextResponse.json({ error: 'Не удалось получить текстовое содержимое для генерации отзыва.' }, { status: 500 });
        }

        const maxContentLength = 50000;
        const truncatedContent = fileContentText.length > maxContentLength
            ? fileContentText.substring(0, maxContentLength) + "... [содержимое обрезано]"
            : fileContentText;

        // --- Поиск User ID автора или валидация ника через Twitch API (СТАРАЯ ЛОГИКА) ---
        let authorUserId = null; // ID автора в НАШЕЙ базе (может быть null)
        let validatedTwitchUser = null; // Данные автора с Twitch (если не в нашей базе)
        let streamerTwitchId = null; // Twitch ID автора/стримера
        let streamerDisplayName = null;

        try {
            const nicknameLower = authorTwitchName.toLowerCase();
            console.log(`[API /generate-full] Ищем автора в БД по нику: ${nicknameLower}`);
            // Пытаемся найти по разным полям, где мог сохраниться логин
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .select('user_id, twitch_user_id, twitch_display_name')
                 .or(`user_metadata->>user_name.eq.${nicknameLower},raw_user_meta_data->>login.eq.${nicknameLower},raw_user_meta_data->>name.eq.${nicknameLower}`)
                .maybeSingle();

            if (profileError) throw new Error(`Database error (author lookup): ${profileError.message}`);

            if (profileData) {
                 authorUserId = profileData.user_id;
                 streamerTwitchId = profileData.twitch_user_id || null;
                 streamerDisplayName = profileData.twitch_display_name || null;
                 console.log(`[API /generate-full] Автор ${nicknameLower} найден в БД. User ID: ${authorUserId}`);
            } else {
                console.log(`[API /generate-full] Автор ${nicknameLower} не найден в БД. Проверяем на Twitch...`);
                validatedTwitchUser = await validateTwitchUser(nicknameLower);
                if (!validatedTwitchUser) {
                    console.warn(`[API /generate-full] Автор с ником ${authorTwitchName} не найден и на Twitch.`);
                    return NextResponse.json({ error: `Пользователь Twitch с никнеймом '${authorTwitchName}' не найден.` }, { status: 404 });
                } else {
                    console.log(`[API /generate-full] Автор ${authorTwitchName} найден на Twitch. ID: ${validatedTwitchUser.id}, Display Name: ${validatedTwitchUser.display_name}`);
                    streamerTwitchId = validatedTwitchUser.id;
                    streamerDisplayName = validatedTwitchUser.display_name || validatedTwitchUser.displayName || null;
                    // authorUserId остается null, но мы знаем, что юзер валиден
                }
            }
        } catch (dbLookupError) {
             console.error(`[API /generate-full] Ошибка поиска/валидации автора ${authorTwitchName}:`, dbLookupError);
             let statusCode = 500;
             let message = `Ошибка поиска автора: ${dbLookupError.message || dbLookupError}`;
             if (dbLookupError.message?.includes('Twitch API request failed')) statusCode = 503;
             return NextResponse.json({ error: message }, { status: statusCode });
        }
        // -------------------------------------------------------------------------

        console.log(`[API /generate-full] Generating review. Author: ${authorTwitchName} (User ID: ${authorUserId ?? 'N/A'}), Source: ${processingSource}`);

        // --- Промпт для генерации ПОЛНОГО отзыва (СТАРЫЙ) ---
        const systemPrompt = `You are a helpful assistant tasked with writing a review based on provided content (text, transcript).
        Your goal is to analyze the content about an item (like a game, movie, or a streamer's content) and the specified author of that content.
        You MUST provide the review text, a rating from 1 to 5 (1 = very bad, 5 = excellent), the most likely category for the item, the item's name, and optionally a subcategory if applicable.
        Consider the context: the review will be published on a platform called "Streamers Universe".
        Analyze the sentiment, key points, and overall quality discussed in the content.
        **Output Format:** You MUST respond ONLY with a valid JSON object containing the following keys:
        - "review_text": (string) Your generated review text. Be objective but engaging. Max 1000 characters.
        - "rating": (integer) A rating from 1 to 5 based on the content analysis.
        - "category": (string) The most likely category (e.g., "Игры", "Фильмы", "Стримеры", "Музыка", "Техника и Гаджеты"). Use Russian category names.
        - "item_name": (string) The name of the item being reviewed (e.g., "Cyberpunk 2077", "Дюна: Часть вторая", "StreamerName"). If the content is about a streamer, use the provided author's name as the item name.
        - "subcategory": (string, optional) If applicable, provide a subcategory (e.g., for "Игры": "RPG", "Шутер"; for "Стримеры": "Just Chatting", "Gameplay"). Use Russian subcategory names if possible.
        Example response:
        {
          "review_text": "Based on the transcript, the streamer provided insightful commentary on the game's mechanics...",
          "rating": 4,
          "category": "Стримеры",
          "item_name": "StreamerName",
          "subcategory": "Gameplay"
        }
        DO NOT include any other text, explanations, or markdown formatting outside the JSON object.`;

        const userPrompt = `Content Author Twitch Name: ${authorTwitchName}

Content provided:
---
${truncatedContent}
---

Please generate the review JSON based on this content. Remember the JSON format with keys: review_text, rating, category, item_name, subcategory (optional).`;
        // ------------------------------------------------------

        console.log(`[API /generate-full] Sending request to AI. Prompt size approx: ${systemPrompt.length + userPrompt.length}`);

        const aiResponse = await openrouter.chat.completions.create({
            model: "google/gemini-2.5-pro-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.6,
        });

        console.log('[API /generate-full] Raw AI Response:', JSON.stringify(aiResponse, null, 2));

        const aiResultString = aiResponse.choices?.[0]?.message?.content?.trim();
        const choiceReason = aiResponse.choices?.[0]?.finish_reason;

        if (!aiResultString) {
            console.error(`[API /generate-full] AI returned empty or no content. Finish reason: ${choiceReason}.`);
            throw new Error(`AI не вернул контент ответа. Причина завершения: ${choiceReason || 'unknown'}`);
        }
        console.log(`[API /generate-full] AI response string received (${aiResultString.length} chars). Finish reason: ${choiceReason}.`);

        let reviewJson;
        try {
            reviewJson = JSON.parse(aiResultString);
        } catch (parseError) {
            console.error('[API /generate-full] Failed to parse AI JSON response:', aiResultString);
            throw new Error(`Ошибка парсинга ответа от AI: ${parseError.message}`);
        }

        const { review_text, rating, category: aiCategory, item_name: aiItemName, subcategory: aiSubcategory } = reviewJson;
        if (!review_text || typeof rating !== 'number' || !aiCategory || !aiItemName) {
            console.error('[API /generate-full] Invalid JSON structure from AI:', reviewJson);
            throw new Error('AI вернул JSON в неверном формате.');
        }

        // --- СОХРАНЕНИЕ В БД (СТАРАЯ ЛОГИКА) ---
        const finalSourceIdentifier = sourceFilePath || sourceUrl;
        const { data: reviewData, error: insertError } = await supabaseAdmin
            .from('reviews')
            .insert({
                user_id: authorUserId, // ID автора в нашей базе (может быть null)
                category: aiCategory,
                subcategory: aiSubcategory || null,
                item_name: aiItemName, // Имя от AI (может быть ником автора)
                review_text: review_text,
                rating: rating,
                source_file_path: finalSourceIdentifier, // Путь к файлу в storage или URL
                status: 'pending', // Ставим на модерацию
                author_twitch_nickname: authorTwitchName, // Ник автора, чей контент анализировался
                streamer_twitch_id: streamerTwitchId,
                author_twitch_display_name: streamerDisplayName,
                streamer_display_name: streamerDisplayName,
                generated_by_user_id: userId // ID пользователя, кто запустил генерацию
            })
            .select('id')
            .single();

        if (insertError) {
             console.error(`[API /generate-full] DB insert error for review by ${userId} about ${authorTwitchName}:`, insertError);
             throw insertError; // Пробрасываем ошибку БД
        }
        // ---------------------------------------

        console.log(`[API /generate-full] Generated review saved with ID: ${reviewData?.id} by user ${userId} about author: ${authorTwitchName}`);
        return NextResponse.json({ message: 'Review generated and submitted for moderation.', reviewId: reviewData?.id }, { status: 201 });

    } catch (error) {
        console.error("[API /generate-full] Unexpected error in POST handler:", error);
        // Возвращаем статус 500 по умолчанию
        let statusCode = 500;
        // Если ошибка содержит статус-код (например, от fetch или Supabase), используем его
        if (error.status && typeof error.status === 'number') {
             statusCode = error.status;
        } else if (error.message?.includes('Auth') || error.message?.includes('Unauthorized')) {
             statusCode = 401; // На всякий случай
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: statusCode });
    }
} 