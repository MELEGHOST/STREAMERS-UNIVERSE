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
        // Выбираем формат только с аудио, предпочтительно opus или aac
        const info = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
        if (!format) {
            throw new Error('Не найден подходящий аудиоформат для этого YouTube видео.');
        }
        console.log(`[getYoutubeAudioStream] Chosen format: ${format.mimeType}, ${format.audioBitrate}kbps`);
        // Создаем поток PassThrough для передачи в Whisper
        const stream = new PassThrough(); 
        ytdl(url, { format: format }).pipe(stream);
        return stream; // Возвращаем поток
    } catch (error) {
        console.error(`[getYoutubeAudioStream] Error getting audio stream:`, error);
        throw new Error(`Ошибка получения аудио с YouTube: ${error.message}`);
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
        const { category, subcategory, itemName, sourceFilePath, sourceUrl, authorTwitchNickname } = body;

        if (!category || !itemName || !authorTwitchNickname || (!sourceFilePath && !sourceUrl)) {
            return NextResponse.json({ error: 'Missing required fields (category, itemName, authorTwitchNickname, and either sourceFilePath or sourceUrl)' }, { status: 400 });
        }
        if (sourceFilePath && sourceUrl) {
             return NextResponse.json({ error: 'Provide either sourceFilePath or sourceUrl, not both.' }, { status: 400 });
        }

        console.log(`[API /generate] Processing request for ${itemName}. Category: ${category}. Author Nickname: ${authorTwitchNickname}`);

        let fileContentText = '';
        let processingSource = '';
        let streamSource = null; // Источник для Whisper (файл или поток)
        let sourceFileName = 'source_file'; // Имя файла для Whisper

        // --- Обработка источника: файл или URL --- 
        if (sourceFilePath) {
            processingSource = `file: ${sourceFilePath}`;
            console.log(`[API /generate] Processing uploaded file: ${sourceFilePath}`);
            // 1. Скачиваем файл
            const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
                .from('reviews-sources')
                .download(sourceFilePath);
            if (downloadError) throw new Error(`Failed to download source file: ${downloadError.message}`);
            if (!fileBlob) throw new Error('Downloaded file data is empty.');

            const fileType = fileBlob.type;
            sourceFileName = sourceFilePath.split('/').pop() || 'uploaded_file';
            console.log(`[API /generate] Downloaded file type: ${fileType}, name: ${sourceFileName}`);

            if (fileType === 'text/plain') {
                console.log(`[API /generate] Reading text content from file...`);
                fileContentText = await fileBlob.text();
            } else if (fileType.startsWith('audio/') || fileType.startsWith('video/')) {
                console.log(`[API /generate] Preparing Blob for Whisper transcription...`);
                // Для Whisper API с SDK нужен объект File или ReadableStream
                streamSource = new File([fileBlob], sourceFileName, { type: fileType });
            } else {
                throw new Error(`Неподдерживаемый тип файла: ${fileType}. Поддерживаются .txt, аудио и видео форматы.`);
            }
        } else if (sourceUrl) {
            processingSource = `url: ${sourceUrl}`;
            console.log(`[API /generate] Processing URL: ${sourceUrl}`);
            if (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be')) {
                console.log('[API /generate] Detected YouTube URL.');
                sourceFileName = `youtube_${ytdl.getVideoID(sourceUrl)}.mp3`; // Имя для Whisper
                streamSource = await getYoutubeAudioStream(sourceUrl);
                console.log('[API /generate] Got YouTube audio stream.');
            } 
            // else if (sourceUrl.includes('twitch.tv') && sourceUrl.includes('/clip/')) {
            //     console.log('[API /generate] Detected Twitch Clip URL.');
            //     sourceFileName = `twitch_clip_${/* extract clip id */}.mp4`; 
            //     streamSource = await getTwitchClipStream(sourceUrl); // TODO: Implement
            // }
            else {
                // Пока другие URL не поддерживаем
                throw new Error('Неподдерживаемый URL. Сейчас поддерживаются только ссылки YouTube.'); 
            }
        }
        // -----------------------------------------

        // --- Транскрипция, если нужен streamSource --- 
        if (streamSource) {
             console.log(`[API /generate] Sending stream/file '${sourceFileName}' to Whisper...`);
             try {
                // Важно: SDK ожидает File или ReadableStream
                const transcriptionResponse = await openrouter.audio.transcriptions.create({
                    model: "openai/whisper-1",
                    file: streamSource, // Передаем File или ReadableStream
                    // response_format: 'text' // Вроде бы по умолчанию text
                });

                // Проверяем ответ Whisper
                // Ответ может быть объектом { text: "..." } или просто строкой
                if (typeof transcriptionResponse === 'string') {
                     fileContentText = transcriptionResponse.trim();
                } else if (transcriptionResponse && typeof transcriptionResponse.text === 'string') {
                    fileContentText = transcriptionResponse.text.trim();
                } else {
                     console.error('[API /generate] Whisper did not return valid text.', transcriptionResponse);
                     throw new Error('Ошибка транскрипции: Whisper не вернул текст.');
                }
                
                console.log(`[API /generate] Whisper transcription successful (${fileContentText.length} chars).`);

            } catch (transcriptionError) {
                console.error('[API /generate] Whisper transcription failed:', transcriptionError);
                throw new Error(`Ошибка транскрипции из ${processingSource}: ${transcriptionError.message}`);
            }
        }
        // -------------------------------------------

        // --- Дальнейшая логика: обрезка текста, поиск автора, промпт Gemini, сохранение --- 
        // (этот блок остается почти без изменений, кроме проверки fileContentText)
        
        // Проверка, что у нас есть текст после всех манипуляций
        if (!fileContentText) {
             throw new Error('Не удалось получить текстовое содержимое для генерации отзыва.');
        }

        // 3. Ограничение на размер текста для промпта Gemini
        const maxContentLength = 50000; // <<< УВЕЛИЧИВАЕМ ЛИМИТ ЗНАЧИТЕЛЬНО
        const truncatedContent = fileContentText.length > maxContentLength 
            ? fileContentText.substring(0, maxContentLength) + "... [содержимое обрезано]"
            : fileContentText;
            
        // --- Поиск User ID автора или валидация ника через Twitch API --- 
        let authorUserId = null;
        let foundInDb = false;
        let validatedTwitchUser = null;

        try {
            const nicknameLower = authorTwitchNickname.toLowerCase();
            console.log(`[API Generate Review] Ищем автора в БД по нику: ${nicknameLower}`);
            
            // Сначала ищем в нашей базе
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .select('user_id')
                .eq('raw_user_meta_data->>login', nicknameLower)
                .maybeSingle();

            if (profileError) throw new Error(`Database error (login): ${profileError.message}`);
            
            if (profileData) {
                 authorUserId = profileData.user_id;
                 foundInDb = true;
                 console.log(`[API Generate Review] Автор ${nicknameLower} найден в БД. User ID: ${authorUserId}`);
            } else {
                 // Пробуем по user_name
                 const { data: profileData2, error: profileError2 } = await supabaseAdmin
                    .from('user_profiles')
                    .select('user_id')
                    .eq('user_metadata->>user_name', nicknameLower)
                    .maybeSingle();
                if (profileError2) throw new Error(`Database error (user_name): ${profileError2.message}`);
                
                if (profileData2) {
                    authorUserId = profileData2.user_id;
                    foundInDb = true;
                    console.log(`[API Generate Review] Автор ${nicknameLower} найден в БД (по user_name). User ID: ${authorUserId}`);
                }
            }

            // Если НЕ нашли в БД, ИЛИ если хотим всегда валидировать на Twitch (реши сам)
            // Сейчас: валидируем на твиче, только если НЕ нашли в БД
            if (!foundInDb) {
                console.log(`[API Generate Review] Автор ${nicknameLower} не найден в БД. Проверяем на Twitch...`);
                validatedTwitchUser = await validateTwitchUser(nicknameLower); 
                if (!validatedTwitchUser) {
                    console.warn(`[API Generate Review] Автор с ником ${authorTwitchNickname} не найден и на Twitch.`);
                    // Возвращаем 404, но указываем, что не найден на Twitch
                    return NextResponse.json({ error: `Пользователь Twitch с никнеймом '${authorTwitchNickname}' не найден.` }, { status: 404 });
                } else {
                    console.log(`[API Generate Review] Автор ${authorTwitchNickname} найден на Twitch. ID: ${validatedTwitchUser.id}, Display Name: ${validatedTwitchUser.display_name}`);
                    // authorUserId остается null, но мы знаем, что юзер валиден
                }
            }
            
        } catch (dbLookupError) {
             console.error(`[API Generate Review] Ошибка поиска/валидации автора ${authorTwitchNickname}:`, dbLookupError);
             // Обрабатываем возможные ошибки от Twitch API или БД
             let statusCode = 500;
             let message = `Ошибка поиска автора: ${dbLookupError.message || dbLookupError}`;
             if (dbLookupError.message?.includes('Twitch API request failed')) statusCode = 503; // Service Unavailable (Twitch API down?)
             // Ошибку 404 пробросим из блока try
             return NextResponse.json({ error: message }, { status: statusCode });
        }
        // -------------------------------------------

        console.log(`[API Generate Review] User ${userId} requested generation. Author: ${authorTwitchNickname} (User ID: ${authorUserId ?? 'N/A'}), Item: ${itemName}, Source: ${processingSource}`);

        // 4. Формируем промпт для Gemini
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
        if (!generatedText) throw new Error('AI (Gemini) не смог сгенерировать отзыв.');
        console.log(`[API /generate] Gemini generated text (${generatedText.length} chars).`);

        // 6. Сохраняем результат в БД
        const finalSourceIdentifier = sourceFilePath || sourceUrl;
        const { data: reviewData, error: insertError } = await supabaseAdmin
            .from('reviews')
            .insert({
                user_id: authorUserId, // Будет null, если автор не зареган у нас
                category,
                subcategory: subcategory || null,
                item_name: itemName,
                review_text: generatedText, 
                source_file_path: finalSourceIdentifier,
                status: 'pending',
                author_twitch_nickname: authorTwitchNickname // <<< Всегда сохраняем никнейм
            })
            .select('id') 
            .single();

        if (insertError) throw insertError;

        console.log(`[API /generate] Generated review saved with ID: ${reviewData?.id} for author: ${authorTwitchNickname} (User ID: ${authorUserId ?? 'N/A'})`);
        return NextResponse.json({ message: 'Review generated and submitted for moderation.', reviewId: reviewData?.id }, { status: 201 });

    } catch (error) {
        console.error(`[API /generate] Error processing request:`, error);
        let statusCode = 500;
        const errorMessage = error.message || 'Internal Server Error';
        if (errorMessage.includes('не найден')) statusCode = 404; // Включая "не найден на Twitch"
        if (errorMessage.includes('download') || errorMessage.includes('YouTube')) statusCode = 502; // Bad Gateway
        if (errorMessage.includes('transcription')) statusCode = 500; 
        if (errorMessage.includes('Unsupported file type')) statusCode = 415;
        if (errorMessage.includes('Unsupported URL')) statusCode = 400;
        if (errorMessage.includes('author') || errorMessage.includes('зарегистрирован')) statusCode = 404; // Author not found
        if (errorMessage.includes('Неверная ссылка YouTube')) statusCode = 400;
        if (errorMessage.includes('аудиоформат')) statusCode = 400; // Youtube format issue
        if (errorMessage.includes('AI') || errorMessage.includes('Gemini')) statusCode = 503; // AI Service Unavailable
        if (error.status) statusCode = error.status; // Если ошибка пришла со статусом (напр., от Supabase)

        return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
} 