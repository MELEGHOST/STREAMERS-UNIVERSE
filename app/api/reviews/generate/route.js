import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import supabase from '../../../../lib/supabase';
import { DataStorage } from '../../../utils/dataStorage';

/**
 * Обработка запроса на генерацию отзыва с помощью нейросети
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
      const { data: publicUrl } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);
      
      if (publicUrl && publicUrl.publicUrl) {
        fileUrls.push(publicUrl.publicUrl);
      }
    }
    
    if (fileUrls.length === 0) {
      return NextResponse.json(
        { error: 'Не удалось получить URL файлов' },
        { status: 500 }
      );
    }
    
    // Здесь будет отправка запроса к AI API (OpenAI или другому сервису)
    // В данном примере мы имитируем работу нейросети с задержкой
    
    // Пример функции для имитации обработки нейросетью
    const generatedReview = await simulateAIProcessing(fileUrls, authorName, productName, category, rating);
    
    // Обновляем запись отзыва в базе данных
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        content: generatedReview.content,
        sources: generatedReview.sources
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
    console.error('Произошла ошибка при обработке файлов нейросетью:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при обработке запроса' },
      { status: 500 }
    );
  }
}

/**
 * Функция для имитации обработки файлов нейросетью
 * В реальном приложении здесь будет запрос к API OpenAI или другому сервису AI
 */
async function simulateAIProcessing(fileUrls, authorName, productName, category, rating) {
  // Имитируем задержку обработки
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Информация о категории
  const categoryInfo = category 
    ? `в категории "${getCategoryDisplayName(category)}"` 
    : '';
  
  // Информация о рейтинге
  const ratingInfo = rating 
    ? `с рейтингом ${rating}/5` 
    : '';
  
  // Генерируем текст отзыва
  const content = `
    По результатам анализа материалов, ${authorName} оставил отзыв о продукте "${productName}" ${categoryInfo} ${ratingInfo}.
    
    ${getRandomReviewText(productName, rating)}
    
    Отзыв создан на основе загруженных материалов с использованием технологии искусственного интеллекта.
  `.trim();
  
  // Генерируем список источников
  const sources = fileUrls.map(url => url);
  
  return {
    content,
    sources
  };
}

/**
 * Получение отображаемого имени категории
 */
function getCategoryDisplayName(category) {
  const categories = {
    'electronics': 'Электроника',
    'clothing': 'Одежда',
    'food': 'Еда',
    'games': 'Игры',
    'services': 'Услуги',
    'other': 'Другое'
  };
  
  return categories[category] || category;
}

/**
 * Генерация случайного текста отзыва
 */
function getRandomReviewText(productName, rating) {
  // Варианты текстов для разных рейтингов
  const reviewTexts = {
    1: [
      `К сожалению, продукт "${productName}" не оправдал ожиданий. Были выявлены серьезные недостатки в качестве и функциональности.`,
      `Автор крайне разочарован продуктом "${productName}". В материалах отмечены многочисленные проблемы и дефекты.`
    ],
    2: [
      `Продукт "${productName}" вызвал смешанные чувства. В нем есть как положительные стороны, так и существенные недостатки.`,
      `Автор скорее не рекомендует продукт "${productName}". Несмотря на некоторые достоинства, недостатки перевешивают.`
    ],
    3: [
      `Продукт "${productName}" получил среднюю оценку. Он в целом соответствует заявленным характеристикам, но не выделяется на фоне конкурентов.`,
      `"${productName}" - обычный продукт без особых преимуществ, но и без серьезных недостатков.`
    ],
    4: [
      `Автор положительно оценивает продукт "${productName}". Отмечены хорошее качество, функциональность и соотношение цена/качество.`,
      `"${productName}" получил высокую оценку. Продукт соответствует ожиданиям и обладает рядом преимуществ.`
    ],
    5: [
      `Автор в восторге от продукта "${productName}". В материалах отмечается исключительное качество, надежность и функциональность.`,
      `"${productName}" заслужил наивысшую оценку! Продукт превзошел все ожидания и является лучшим в своей категории.`
    ]
  };
  
  // Если рейтинг не указан, выбираем случайный текст
  if (!rating) {
    const allTexts = [].concat(...Object.values(reviewTexts));
    return allTexts[Math.floor(Math.random() * allTexts.length)];
  }
  
  // Возвращаем случайный текст для указанного рейтинга
  const textsForRating = reviewTexts[rating] || reviewTexts[3];
  return textsForRating[Math.floor(Math.random() * textsForRating.length)];
} 