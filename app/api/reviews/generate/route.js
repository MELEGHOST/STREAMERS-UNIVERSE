import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../../utils/jwt';
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
        const { category, itemName, sourceFilePath } = body;

        if (!category || !itemName || !sourceFilePath) {
            return NextResponse.json({ error: 'Missing required fields (category, itemName, sourceFilePath)' }, { status: 400 });
        }

        console.log(`[API /generate] Generating review for ${itemName} (${category}) from ${sourceFilePath} for user ${userId}...`);

        // 1. Скачиваем содержимое TXT файла из Supabase Storage
        console.log(`[API /generate] Downloading file: ${sourceFilePath}`);
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('reviews-sources') // Убедись, что бакет называется так
            .download(sourceFilePath);
        
        if (downloadError) throw new Error(`Failed to download source file: ${downloadError.message}`);
        if (!fileData) throw new Error('Downloaded file data is empty.');
        
        const fileContent = await fileData.text();
        console.log(`[API /generate] File content downloaded (${fileContent.length} chars).`);

        // Ограничение на размер контента для промпта (например, ~4000 символов)
        const maxContentLength = 4000;
        const truncatedContent = fileContent.length > maxContentLength 
            ? fileContent.substring(0, maxContentLength) + "... [содержимое обрезано]"
            : fileContent;

        // 2. Формируем промпт для Gemini 2.5 Pro
        const prompt = `На основе следующего текста напиши краткий отзыв (1-2 абзаца) на "${itemName}" в категории "${category}". Отзыв должен отражать основную суть текста, быть написан от первого лица и подходить для публикации на платформе с отзывами. Не включай оценку (рейтинг). Текст для анализа:

---
${truncatedContent}
---

Краткий отзыв:`;

        console.log(`[API /generate] Sending request to OpenRouter (Gemini 2.5 Pro)...`);

        // 3. Выполняем запрос к OpenRouter
        const response = await openrouter.chat.completions.create({
            model: "google/gemini-2.5-pro-exp-03-25:free", // Используем указанную модель
            messages: [
                { role: "system", content: "Ты - AI ассистент, который пишет краткие отзывы на основе предоставленного текста." },
                { role: "user", content: prompt }
            ],
            max_tokens: 300, // Ограничение на длину ответа
            temperature: 0.7, // Немного креативности
        });

        const generatedText = response.choices[0]?.message?.content?.trim();

        if (!generatedText) {
            console.error("[API /generate] AI did not return content.", response);
            throw new Error('AI не смог сгенерировать отзыв.');
        }

        console.log(`[API /generate] AI generated text (${generatedText.length} chars).`);

        // 4. Сохраняем результат в базу данных со статусом 'pending'
        const { data: reviewData, error: insertError } = await supabaseAdmin
            .from('reviews')
            .insert({
                user_id: userId,
                category,
                item_name: itemName,
                // rating: null, // Рейтинг для AI отзыва не устанавливаем
                generated_content: generatedText,
                source_file_url: supabaseAdmin.storage.from('reviews-sources').getPublicUrl(sourceFilePath).data.publicUrl, // Получаем публичный URL
                status: 'pending' // Статус "ожидает модерации"
            })
            .select();

        if (insertError) throw insertError;

        console.log(`[API /generate] Generated review saved with ID: ${reviewData?.[0]?.id} and status 'pending'.`);
        return NextResponse.json({ message: 'Review generated and submitted for moderation.', reviewId: reviewData?.[0]?.id }, { status: 201 });

    } catch (error) {
        console.error(`[API /generate] Error generating review for user ${userId}:`, error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
} 