import { NextResponse } from 'next/server';

// Список категорий для отзывов
const categories = [
  { id: 'friendly', name: 'Дружелюбный' },
  { id: 'helpful', name: 'Полезный' },
  { id: 'knowledgeable', name: 'Знающий' },
  { id: 'entertaining', name: 'Развлекательный' },
  { id: 'professional', name: 'Профессиональный' },
  { id: 'creative', name: 'Креативный' },
  { id: 'funny', name: 'Смешной' },
  { id: 'engaging', name: 'Вовлекающий' },
  { id: 'consistent', name: 'Постоянный' },
  { id: 'interactive', name: 'Интерактивный' },
  { id: 'skilled', name: 'Умелый' },
  { id: 'positive', name: 'Позитивный' },
  { id: 'informative', name: 'Информативный' },
  { id: 'authentic', name: 'Аутентичный' },
  { id: 'energetic', name: 'Энергичный' }
];

export async function GET() {
  try {
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Ошибка при получении категорий:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 