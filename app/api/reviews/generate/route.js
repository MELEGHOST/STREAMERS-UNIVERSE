import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import supabase from '../../../../lib/supabase';

// Адрес Hugging Face Inference API для модели distilgpt2
const HF_API_URL = "https://api-inference.huggingface.co/models/distilgpt2";

/**
 * Обработка запроса на генерацию отзыва с помощью AI
 */
export async function POST(request) {
  try {
    // Проверяем авторизацию пользователя
    const cookieStore = cookies();
    const userCookie = cookieStore.get('twitch_user');
    
    if (!userCookie) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }
    
    // Получаем данные из запроса
    const { reviewId, files, authorName, productName, category, rating } = await request.json();
    
    if (!reviewId || !files || files.length === 0) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные параметры' },
        { status: 400 }
      );
    }
    
    // Получаем публичные URL для файлов
    const fileUrls = [];
    
    for (const filePath of files) {
      // Получаем публичный URL файла
      const { data: publicUrlData } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);
      
      if (publicUrlData && publicUrlData.publicUrl) {
        fileUrls.push(publicUrlData.publicUrl);
      }
    }
    
    if (fileUrls.length === 0) {
      return NextResponse.json(
        { error: 'Не удалось получить URL файлов' },
        { status: 500 }
      );
    }
    
    // Формируем промпт для AI
    // TODO: Улучшить промпт для более качественных и релевантных отзывов
    const prompt = `Напиши короткий отзыв на русском языке о "${productName}" от пользователя ${authorName}. Учти, что категория продукта: ${category || 'не указана'}, а рейтинг: ${rating || 'не указан'} из 5. Упомяни, что отзыв основан на предоставленных материалах.`;
    
    // Отправляем запрос к Hugging Face Inference API
    let generatedContent = "Не удалось сгенерировать отзыв с помощью AI."; // Значение по умолчанию
    try {
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${process.env.HF_TOKEN}` // Раскомментируйте и добавьте токен в переменные окружения Vercel, если потребуется
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { // Параметры генерации (можно настроить)
            max_length: 100, // Максимальная длина отзыва
            num_return_sequences: 1,
            temperature: 0.7, // "Креативность" модели
            // repetition_penalty: 1.1 // Штраф за повторения
          }
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Ошибка от Hugging Face API (${response.status}): ${errorBody}`);
        // Не прерываем выполнение, используем текст по умолчанию
      } else {
        const result = await response.json();
        if (result && result.length > 0 && result[0].generated_text) {
          // Очищаем результат от исходного промпта, если модель его повторяет
          generatedContent = result[0].generated_text.replace(prompt, '').trim();
           // Дополнительная обработка для удаления возможных артефактов
          generatedContent = generatedContent.split('\n')[0].trim(); // Берем первую строку
          if (generatedContent.length < 20) { // Если результат слишком короткий, используем шаблон
             generatedContent = `Отзыв о "${productName}" (${category || 'разное'}), рейтинг ${rating || '?'}/5. Основан на материалах от ${authorName}.`;
          }
        }
      }
    } catch (apiError) {
      console.error('Ошибка при вызове Hugging Face API:', apiError);
      // Используем текст по умолчанию
    }
    
    // Обновляем запись отзыва в базе данных
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        content: generatedContent, // Используем сгенерированный текст
        sources: fileUrls // Используем полученные URL файлов как источники
      })
      .eq('id', reviewId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Ошибка при обновлении отзыва:', updateError);
      return NextResponse.json(
        { error: 'Ошибка при обновлении отзыва в базе данных' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      review: updatedReview
    });
    
  } catch (error) {
    console.error('Произошла ошибка при обработке генерации отзыва:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при обработке запроса' },
      { status: 500 }
    );
  }
} 