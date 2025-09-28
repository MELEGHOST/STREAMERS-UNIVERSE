import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// POST /api/i18n/translate
// Body: { text: string, sourceLang?: string, targetLang: string }
// Uses OpenRouter with Hunyuan-MT model by default
export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured' }, { status: 500 });
    }

    const { text, sourceLang, targetLang } = await request.json();
    if (!text || !targetLang) {
      return NextResponse.json({ error: 'text and targetLang are required' }, { status: 400 });
    }

    const model = process.env.HUNYUAN_MT_MODEL || 'tencent/hunyuan-translate';

    const client = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' });

    const system = `You are a machine translation engine. Translate strictly and faithfully. Output ONLY the translated text with no extra quotes or formatting.`;
    const user = `Translate the following text${sourceLang ? ` from ${sourceLang}` : ''} to ${targetLang}:
---
${text}
---`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.2,
    });

    const translated = completion?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!translated) {
      return NextResponse.json({ error: 'Empty translation result' }, { status: 502 });
    }
    return NextResponse.json({ translated });
  } catch (err) {
    console.error('[i18n/translate] Error:', err);
    return NextResponse.json({ error: err?.message || 'Translation failed' }, { status: 500 });
  }
}
