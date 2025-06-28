// import OpenAI from 'openai';
import { NextResponse } from 'next/server';
// import { oneLine, stripIndent } from 'common-tags';

/* const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
}); */

export async function POST(/* req */) {
  /* try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENROUTER_API_KEY missing!');
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

// ... existing code ...
      },
      stream: true,
    });

    return new Response(stream.toReadableStream());
  } catch (error) {
    console.error('Error generating review:', error);
    return NextResponse.json({ error: 'Failed to generate review.' }, { status: 500 });
  } */
  return NextResponse.json({ error: 'This endpoint is temporarily disabled.' }, { status: 503 });
} 