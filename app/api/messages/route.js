import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Временное хранилище сообщений (в реальном приложении будет база данных)
let messages = [];

// Получение сообщений для пользователя
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Не указан ID пользователя' }, { status: 400 });
    }
    
    let userMessages = [];
    
    if (conversationId) {
      // Получаем сообщения конкретной беседы
      userMessages = messages.filter(msg => msg.conversationId === conversationId);
    } else {
      // Получаем все сообщения пользователя (отправленные и полученные)
      userMessages = messages.filter(msg => 
        msg.senderId === userId || msg.receiverId === userId
      );
      
      // Группируем сообщения по беседам
      const conversations = {};
      
      userMessages.forEach(msg => {
        if (!conversations[msg.conversationId]) {
          conversations[msg.conversationId] = {
            id: msg.conversationId,
            participants: [msg.senderId, msg.receiverId],
            lastMessage: msg,
            messages: []
          };
        }
        
        conversations[msg.conversationId].messages.push(msg);
        
        // Обновляем последнее сообщение, если текущее новее
        if (new Date(msg.createdAt) > new Date(conversations[msg.conversationId].lastMessage.createdAt)) {
          conversations[msg.conversationId].lastMessage = msg;
        }
      });
      
      // Преобразуем объект бесед в массив
      userMessages = Object.values(conversations);
    }
    
    return NextResponse.json({ 
      success: true, 
      messages: userMessages 
    });
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error);
    return NextResponse.json({ error: 'Ошибка при получении сообщений' }, { status: 500 });
  }
}

// Отправка нового сообщения
export async function POST(request) {
  try {
    const data = await request.json();
    const { senderId, receiverId, content } = data;
    
    if (!senderId || !receiverId || !content) {
      return NextResponse.json({ error: 'Не указаны необходимые параметры' }, { status: 400 });
    }
    
    // Создаем или получаем ID беседы
    const participantIds = [senderId, receiverId].sort();
    const conversationId = `conv-${participantIds.join('-')}`;
    
    // Создаем новое сообщение
    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId,
      receiverId,
      content,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    messages.push(newMessage);
    
    // Сохраняем в localStorage (в реальном приложении будет сохранение в БД)
    try {
      // Получаем текущие сообщения из localStorage
      const cookieStore = cookies();
      const storedMessages = cookieStore.get('su_messages');
      let parsedMessages = [];
      
      if (storedMessages) {
        try {
          parsedMessages = JSON.parse(storedMessages.value);
        } catch (e) {
          console.error('Ошибка при парсинге сообщений из cookies:', e);
        }
      }
      
      // Добавляем новое сообщение
      parsedMessages.push(newMessage);
      
      // Обновляем сообщения в localStorage
      cookieStore.set('su_messages', JSON.stringify(parsedMessages));
    } catch (e) {
      console.error('Ошибка при сохранении сообщений в cookies:', e);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: newMessage 
    });
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    return NextResponse.json({ error: 'Ошибка при отправке сообщения' }, { status: 500 });
  }
}

// Отметка сообщений как прочитанных
export async function PATCH(request) {
  try {
    const data = await request.json();
    const { userId, conversationId, messageIds } = data;
    
    if (!userId || (!conversationId && !messageIds)) {
      return NextResponse.json({ error: 'Не указаны необходимые параметры' }, { status: 400 });
    }
    
    let updatedMessages = [];
    
    if (messageIds && Array.isArray(messageIds)) {
      // Отмечаем конкретные сообщения как прочитанные
      messages = messages.map(msg => {
        if (messageIds.includes(msg.id) && msg.receiverId === userId) {
          updatedMessages.push({ ...msg, read: true });
          return { ...msg, read: true };
        }
        return msg;
      });
    } else if (conversationId) {
      // Отмечаем все сообщения в беседе как прочитанные
      messages = messages.map(msg => {
        if (msg.conversationId === conversationId && msg.receiverId === userId) {
          updatedMessages.push({ ...msg, read: true });
          return { ...msg, read: true };
        }
        return msg;
      });
    }
    
    // Обновляем localStorage (в реальном приложении будет обновление в БД)
    try {
      // Получаем текущие сообщения из localStorage
      const cookieStore = cookies();
      const storedMessages = cookieStore.get('su_messages');
      let parsedMessages = [];
      
      if (storedMessages) {
        try {
          parsedMessages = JSON.parse(storedMessages.value);
        } catch (e) {
          console.error('Ошибка при парсинге сообщений из cookies:', e);
        }
      }
      
      // Обновляем статус прочтения сообщений
      parsedMessages = parsedMessages.map(msg => {
        if (messageIds && Array.isArray(messageIds)) {
          if (messageIds.includes(msg.id) && msg.receiverId === userId) {
            return { ...msg, read: true };
          }
        } else if (conversationId) {
          if (msg.conversationId === conversationId && msg.receiverId === userId) {
            return { ...msg, read: true };
          }
        }
        return msg;
      });
      
      // Обновляем сообщения в localStorage
      cookieStore.set('su_messages', JSON.stringify(parsedMessages));
    } catch (e) {
      console.error('Ошибка при обновлении сообщений в cookies:', e);
    }
    
    return NextResponse.json({ 
      success: true, 
      updatedMessages 
    });
  } catch (error) {
    console.error('Ошибка при обновлении статуса сообщений:', error);
    return NextResponse.json({ error: 'Ошибка при обновлении статуса сообщений' }, { status: 500 });
  }
} 