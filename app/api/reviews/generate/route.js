import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { oneLine, stripIndent } from 'common-tags';
// Убрана глобальная инициализация, чтоб не валилось при билде
export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENROUTER_API_KEY missing!');
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1'
    });
    const { title } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const stream = openai.beta.chat.completions.stream({
      model: 'openai/gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: oneLine`You are a helpful review generator.` },
        { role: 'user', content: stripIndent`Generate a sample review for ${title}.` }
      ],
      stream: true,
    });
    return new Response(stream.toReadableStream());
  } catch (error) {
    console.error('Error generating review:', error);
    return NextResponse.json({ error: 'Failed to generate review.' }, { status: 500 });
  }
} 