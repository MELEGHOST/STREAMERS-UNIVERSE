'use server'; // Указываем, что это серверный компонент/маршрут

import { NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // Не используем старую авторизацию
// import supabase from '../../../../lib/supabase'; // Используем SSR клиент
import { createServerClient } from '@supabase/ssr'; // Используем SSR клиент
import { cookies } from 'next/headers'; // Нужен для SSR клиента

// Адрес OpenRouter API
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "google/gemini-2.5-pro-exp-03-25:free"; // Используем Gemini 2.5 Pro Free

// Вспомогательная функция для создания SSR клиента Supabase
const createSupabaseAdminClient = () => {
    // Используем СЕРВИСНЫЙ КЛЮЧ для операций обновления из API,
    // так как RLS могут запрещать обновление чужих записей даже админу,
    // а проверка прав администратора должна быть реализована отдельно.
    // Убедитесь, что SUPABASE_SERVICE_KEY добавлен в переменные окружения!
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('API generate: Отсутствуют Supabase URL или Service Key');
        throw new Error('Server configuration error');
    }
    // При использовании Service Role Key не требуется передавать cookies
    return createServerClient(supabaseUrl, supabaseServiceKey, { cookies: {} }); 
};

const createSupabaseClientWithAuth = () => {
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name) { return cookieStore.get(name)?.value },
                set(name, value, options) { cookieStore.set({ name, value, ...options, sameSite: options.sameSite || 'Lax' }) },
                remove(name, options) { cookieStore.set({ name, value: '', ...options, sameSite: options.sameSite || 'Lax' }) },
            },
        }
    );
};

// Функция для чтения текстового файла из Supabase Storage
async function getTextFileContent(supabaseAdmin, filePath) {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from('reviews') // Имя бакета
            .download(filePath);
        if (error) throw error;
        return await data.text();
    } catch (error) {
        console.error(`Ошибка чтения файла ${filePath}:`, error);
        return null; // Возвращаем null в случае ошибки
    }
}


export async function POST(request) {
    const supabaseAuth = createSupabaseClientWithAuth();
    let supabaseAdmin;
    try {
        supabaseAdmin = createSupabaseAdminClient();
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 1. Проверка авторизации пользователя (того, кто загружает)
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();
    if (sessionError || !session) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    const uploaderUserId = session.user.id;
    console.log('API generate: Запрос от пользователя:', uploaderUserId);

    // 2. Получение данных из запроса
    let reviewId, files, authorName, productName, category, rating, authorSocialLink, submittedLinks;
    try {
        const body = await request.json();
        reviewId = body.reviewId;
        files = body.files; // Массив путей к файлам в Storage
        authorName = body.authorName;
        productName = body.productName;
        category = body.category;
        rating = body.rating;
        authorSocialLink = body.authorSocialLink;
        submittedLinks = body.links; // Массив ссылок от пользователя

        if (!reviewId || (!files || files.length === 0) && (!submittedLinks || submittedLinks.length === 0)) {
            return NextResponse.json({ error: 'Отсутствуют обязательные параметры (reviewId и files/links)' }, { status: 400 });
        }
    } catch (e) {
        return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
    }

    // 3. Получение OpenRouter API ключа
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
        console.error('API generate: Отсутствует OPENROUTER_API_KEY');
        await supabaseAdmin.from('reviews').update({ status: 'error_config' }).eq('id', reviewId);
        return NextResponse.json({ error: 'Ошибка конфигурации сервера (AI)' }, { status: 500 });
    }

    // 4. Подготовка данных для AI
    const textContents = [];
    const imageUrls = [];
    const fileSources = []; // Для поля sources в БД

    for (const filePath of files) {
        try {
            const { data: publicUrlData, error: urlError } = supabaseAdmin.storage
                .from('reviews')
                .getPublicUrl(filePath);
            
            if (urlError) throw urlError;
            const publicUrl = publicUrlData?.publicUrl;
            if (!publicUrl) continue; // Пропускаем, если URL не получен
            
            fileSources.push(publicUrl); // Добавляем в источники для БД

            const fileExt = filePath.split('.').pop().toLowerCase();

            if (['txt'].includes(fileExt)) {
                const content = await getTextFileContent(supabaseAdmin, filePath);
                if (content) {
                    textContents.push(content);
                }
            } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt)) {
                imageUrls.push({ type: "image_url", image_url: { url: publicUrl } });
            } 
            // Пока игнорируем аудио/видео для анализа контента

        } catch (error) {
            console.error(`Ошибка обработки файла ${filePath}:`, error);
            // Продолжаем обработку других файлов
        }
    }
    
    // 5. Формирование промпта для AI
    const messages = [
        {
            role: "system",
            content: `Ты - ассистент, помогающий обрабатывать загруженные материалы и создавать структурированные отзывы для сайта Streamers Universe. Проанализируй предоставленные текстовые фрагменты, изображения (по URL), и ссылки. Твоя задача - извлечь или определить:
1.  Основной смысл отзыва.
2.  Оценку (rating) по 5-балльной шкале (если возможно определить, иначе null).
3.  Категорию продукта/услуги из списка: hardware, peripherals, furniture, lighting, audio, software, games, merch, services, accessories, cameras, other (если не ясно, используй 'other').
4.  Подкатегорию (если можешь точно определить, иначе null).
5.  Краткое, но информативное содержание отзыва (content) на русском языке, отражающее суть материалов (максимум 500 символов).

Предоставлена информация:
- Автор оригинального отзыва: ${authorName || 'Не указан'}
- Ссылка на соц. сеть автора: ${authorSocialLink || 'Не указана'}
- Название продукта/услуги: ${productName || 'Не указано'}
- Предварительная категория (если была указана): ${category || 'Не указана'}
- Предварительный рейтинг (если был указан): ${rating || 'Не указан'}
- Предоставленные ссылки: ${submittedLinks && submittedLinks.length > 0 ? submittedLinks.join(', ') : 'Нет'}

Ответ должен быть ТОЛЬКО в формате JSON со следующими ключами: "rating" (число 1-5 или null), "category" (строка из списка), "subcategory" (строка или null), "content" (строка). НЕ добавляй никакого другого текста до или после JSON.`
        },
        {
            role: "user",
            content: [] // Сюда добавим текст, картинки, ссылки
        }
    ];

    // Добавляем текстовый контент
    if (textContents.length > 0) {
        messages[1].content.push({ type: "text", text: "Текстовое содержание из файлов:\n\n" + textContents.join("\n---\n") });
    }
    // Добавляем ссылки
    if (submittedLinks && submittedLinks.length > 0) {
         messages[1].content.push({ type: "text", text: "\n\nПредоставленные ссылки для анализа:\n" + submittedLinks.join("\n") });
    }
    // Добавляем изображения
    if (imageUrls.length > 0) {
        messages[1].content.push(...imageUrls);
    }
    // Если нет ни текста, ни картинок, ни ссылок - добавляем плейсхолдер
    if (messages[1].content.length === 0) {
         messages[1].content.push({ type: "text", text: "Нет текстового или визуального контента для анализа, кроме метаданных." });
    }

    // 6. Вызов OpenRouter API
    let aiResponseData;
    try {
        console.log(`API generate: Отправка запроса к OpenRouter (Модель: ${MODEL_NAME})...`);
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://streamers-universe.vercel.app',
                'X-Title': process.env.NEXT_PUBLIC_APP_NAME || 'Streamers Universe'
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
                max_tokens: 300,
                temperature: 0.5,
            })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => response.text());
            console.error(`API generate: Ошибка от OpenRouter API (${response.status}):`, errorBody);
            const errorMessage = errorBody?.error?.message || JSON.stringify(errorBody) || `Ошибка OpenRouter API ${response.status}`;
            throw new Error(errorMessage);
        }

        aiResponseData = await response.json();
        console.log('API generate: Ответ от OpenRouter получен.');

    } catch (apiError) {
        console.error('API generate: Ошибка при вызове OpenRouter API:', apiError);
        await supabaseAdmin.from('reviews').update({ status: 'error_ai' }).eq('id', reviewId);
        return NextResponse.json({ error: `Ошибка при обращении к AI: ${apiError.message}` }, { status: 502 });
    }

    // 7. Обработка ответа AI и обновление отзыва
    try {
        const choiceContent = aiResponseData?.choices?.[0]?.message?.content;
        if (!choiceContent) {
            throw new Error('Некорректный или пустой ответ от AI');
        }
        
        let generatedData = {};
        try {
            const jsonMatch = choiceContent.match(/\{.*\}/s);
            if (jsonMatch && jsonMatch[0]) {
                generatedData = JSON.parse(jsonMatch[0]);
            } else {
                generatedData = JSON.parse(choiceContent);
            }
        } catch (parseError) {
            console.error('API generate: Не удалось распарсить JSON из ответа AI:', choiceContent, parseError);
            throw new Error(`Не удалось извлечь JSON из ответа AI. Ответ: ${choiceContent}`);
        }

        const finalRating = (typeof generatedData.rating === 'number' && generatedData.rating >= 1 && generatedData.rating <= 5) ? Math.round(generatedData.rating) : (rating || null);
        const finalCategory = generatedData.category || category || 'other';
        const finalSubcategory = generatedData.subcategory || null;
        const finalContent = generatedData.content || 'Не удалось сгенерировать текст отзыва.';

        const updatePayload = {
            content: finalContent,
            rating: finalRating,
            category: finalCategory,
            subcategory: finalSubcategory,
            sources: fileSources,
            status: 'pending_approval',
            updated_at: new Date().toISOString()
        };

        const { data: updatedReview, error: updateError } = await supabaseAdmin
            .from('reviews')
            .update(updatePayload)
            .eq('id', reviewId)
            .select()
            .single();

        if (updateError) {
            console.error('API generate: Ошибка обновления отзыва в БД:', updateError);
            return NextResponse.json({ error: 'Ошибка сохранения результата AI', details: updateError.message }, { status: 500 });
        }

        console.log('API generate: Отзыв успешно обработан AI и обновлен:', updatedReview.id);
        return NextResponse.json({ message: 'Отзыв успешно обработан AI', review: updatedReview });

    } catch (processingError) {
        console.error('API generate: Ошибка обработки ответа AI или обновления БД:', processingError);
        await supabaseAdmin.from('reviews').update({ status: 'error_processing' }).eq('id', reviewId);
        return NextResponse.json({ error: `Ошибка обработки результата AI: ${processingError.message}` }, { status: 500 });
    }
} 