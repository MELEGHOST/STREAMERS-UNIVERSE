import { NextResponse } from 'next/server';
import OpenAI from 'openai'; // Используем openai SDK для OpenRouter

const openRouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openRouterApiKey) {
    console.error("[API /api/reviews/generate] Critical Error: OPENROUTER_API_KEY missing!");
}

// Инициализируем клиент OpenAI для OpenRouter
const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: openRouterApiKey,
});

export async function POST(request) {
    if (!openRouterApiKey) {
         return NextResponse.json({ error: 'AI Service is not configured.' }, { status: 503 });
    }

    try {
        const body = await request.json();
        const { title, category } = body;

        if (!title || !category) {
            console.error("[API /generate] Validation failed: Missing title or category", { title, category });
            return NextResponse.json({ error: 'Missing required fields (title, category)' }, { status: 400 });
        }

        console.log(`[API /generate] Processing AI fill request. Title: ${title}, Category: ${category}`);

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

        console.log(`[API /generate] Sending request to AI for review fill. Title: ${title}, Category: ${category}`);

        const aiResponse = await openrouter.chat.completions.create({
            model: "google/gemini-2.5-pro-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
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

        const requiredKeys = ["text", "rating", "age_rating", "genres", "subcategory", "image_url"];
        if (!requiredKeys.every(key => key in reviewJson)) {
             console.error('[API /generate] Invalid JSON structure from AI:', reviewJson);
             throw new Error('AI вернул JSON в неверном формате (отсутствуют ключи).');
        }

        console.log('[API /generate] Returning generated fields to client.', reviewJson);
        return NextResponse.json(reviewJson, { status: 200 });

    } catch (error) {
        console.error("[API /generate] Unexpected error in POST handler:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
} 