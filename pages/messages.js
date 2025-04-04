import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/messages.module.css';
import { useAuth } from '../contexts/AuthContext';

export default function Messages() {
  const router = useRouter();
  const { isAuthenticated, userId } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [usersData, setUsersData] = useState({}); // Хранилище данных о пользователях
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Загружаем данные пользователей для отображения имен и аватаров
  const loadUsersData = useCallback(async () => {
    try {
      const response = await fetch('/api/users/list');
      if (response.ok) {
        const data = await response.json();
        const usersMap = data.reduce((acc, user) => {
          acc[user.id] = { name: user.username, avatar: user.avatar_url };
          return acc;
        }, {});
        setUsersData(usersMap);
      } else {
        console.error('Ошибка загрузки данных пользователей');
      }
    } catch (error) {
      console.error('Ошибка при запросе данных пользователей:', error);
    }
  }, []);

  // Загружаем беседы пользователя
  const loadConversations = useCallback(async (currentUserId) => {
    if (!currentUserId) return;
    setLoadingConversations(true);
    try {
      const response = await fetch(`/api/messages/conversations?userId=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        console.error('Ошибка загрузки бесед');
        setConversations([]); // Очищаем на случай ошибки
      }
    } catch (error) {
      console.error('Ошибка при запросе бесед:', error);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Загрузка данных при монтировании
  useEffect(() => {
    // console.log('Messages component mounted');
    if (userId) { // Используем userId из useAuth
      // console.log('Current user ID in Messages:', userId);
      loadConversations(userId);
      loadUsersData();
    } else if (!isAuthenticated && typeof window !== 'undefined') {
      // Если не аутентифицирован, перенаправляем на главную
      router.push('/');
    }
  }, [isAuthenticated, userId, loadConversations, loadUsersData, router]);
  
  // Загружаем сообщения активной беседы
  useEffect(() => {
    if (!selectedConversation) return;
    
    const fetchMessages = async () => {
      try {
        // Получаем сообщения из localStorage
        const storedMessages = localStorage.getItem('su_messages');
        
        if (storedMessages) {
          try {
            const parsedMessages = JSON.parse(storedMessages);
            
            // Фильтруем сообщения текущей беседы
            const conversationMessages = parsedMessages.filter(
              msg => msg.conversationId === selectedConversation.id
            );
            
            // Сортируем сообщения по дате
            conversationMessages.sort((a, b) => 
              new Date(a.createdAt) - new Date(b.createdAt)
            );
            
            setMessages(conversationMessages);
            
            // Отмечаем сообщения как прочитанные
            const updatedMessages = parsedMessages.map(msg => {
              if (msg.conversationId === selectedConversation.id && msg.receiverId === userId && !msg.read) {
                return { ...msg, read: true };
              }
              return msg;
            });
            
            localStorage.setItem('su_messages', JSON.stringify(updatedMessages));
            
            // Обновляем счетчик непрочитанных сообщений
            setConversations(prevConversations => 
              prevConversations.map(conv => {
                if (conv.id === selectedConversation.id) {
                  return { ...conv, unreadCount: 0 };
                }
                return conv;
              })
            );
          } catch (e) {
            console.error('Ошибка при парсинге сообщений из localStorage:', e);
          }
        }
      } catch (err) {
        console.error('Ошибка при загрузке сообщений:', err);
      }
    };
    
    fetchMessages();
  }, [selectedConversation, userId]);
  
  // Отправка нового сообщения
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;
    
    try {
      // Определяем получателя (не текущий пользователь)
      const receiverId = selectedConversation.participants.find(id => id !== userId);
      
      // Создаем новое сообщение
      const newMessageObj = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conversationId: selectedConversation.id,
        senderId: userId,
        receiverId,
        content: newMessage,
        createdAt: new Date().toISOString(),
        read: false
      };
      
      // Сохраняем сообщение в localStorage
      const storedMessages = localStorage.getItem('su_messages');
      let messages = [];
      
      if (storedMessages) {
        try {
          messages = JSON.parse(storedMessages);
        } catch (e) {
          console.error('Ошибка при парсинге сообщений из localStorage:', e);
        }
      }
      
      messages.push(newMessageObj);
      localStorage.setItem('su_messages', JSON.stringify(messages));
      
      // Добавляем новое сообщение в список
      setMessages(prev => [...prev, newMessageObj]);
      
      // Обновляем последнее сообщение в беседе
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv.id === selectedConversation.id) {
            return {
              ...conv,
              lastMessage: newMessageObj
            };
          }
          return conv;
        })
      );
      
      // Очищаем поле ввода
      setNewMessage('');
    } catch (err) {
      console.error('Ошибка при отправке сообщения:', err);
      alert('Не удалось отправить сообщение. Пожалуйста, попробуйте позже.');
    }
  };
  
  // Получаем имя пользователя для отображения в беседе
  const getConversationName = (conversation) => {
    if (!conversation) return '';
    
    const otherUserId = conversation.participants.find(id => id !== userId);
    const otherUser = usersData[otherUserId];
    
    return otherUser ? otherUser.name : `Пользователь ${otherUserId}`;
  };
  
  // Получаем аватар пользователя для отображения в беседе
  const getConversationAvatar = (conversation) => {
    if (!conversation) return '/images/default-avatar.png';
    
    const otherUserId = conversation.participants.find(id => id !== userId);
    const otherUser = usersData[otherUserId];
    
    return otherUser && otherUser.avatar ? otherUser.avatar : '/images/default-avatar.png';
  };
  
  // Форматирование даты сообщения
  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Если сообщение отправлено сегодня, показываем только время
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Если сообщение отправлено вчера, показываем "Вчера" и время
    if (date.toDateString() === yesterday.toDateString()) {
      return `Вчера, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Иначе показываем дату и время
    return date.toLocaleString([], { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Сообщения | Streamers Universe</title>
        </Head>
        <div className={styles.authMessage}>
          <h2>Требуется авторизация</h2>
          <p>Пожалуйста, войдите в систему, чтобы просматривать сообщения.</p>
          <button onClick={() => router.push('/login')} className={styles.authButton}>
            Войти
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Сообщения | Streamers Universe</title>
        <meta name="description" content="Сообщения в Streamers Universe" />
      </Head>
      
      <div className={styles.messagesContainer}>
        {/* Список бесед */}
        <div className={styles.conversationsList}>
          <div className={styles.conversationsHeader}>
            <h2>Сообщения</h2>
            <Link href="/menu" className={styles.backButton}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
              Меню
            </Link>
          </div>
          
          {loadingConversations ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Загрузка бесед...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className={styles.emptyState}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
              </svg>
              <p>У вас пока нет сообщений</p>
              <p className={styles.emptyStateSubtext}>Перейдите в профиль пользователя, чтобы начать беседу</p>
            </div>
          ) : (
            <div className={styles.conversationsItems}>
              {conversations.map(conversation => (
                <div 
                  key={conversation.id}
                  className={`${styles.conversationItem} ${selectedConversation && selectedConversation.id === conversation.id ? styles.activeConversation : ''}`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className={styles.conversationAvatar}>
                    <Image 
                      src={getConversationAvatar(conversation)}
                      alt={getConversationName(conversation)}
                      width={50}
                      height={50}
                      className={styles.avatarImage}
                    />
                  </div>
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationHeader}>
                      <h3 className={styles.conversationName}>{getConversationName(conversation)}</h3>
                      <span className={styles.conversationTime}>
                        {conversation.lastMessage && formatMessageDate(conversation.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p className={styles.conversationLastMessage}>
                      {conversation.lastMessage ? (
                        conversation.lastMessage.senderId === userId ? (
                          <span className={styles.outgoingMessage}>Вы: {conversation.lastMessage.content}</span>
                        ) : (
                          conversation.lastMessage.content
                        )
                      ) : ''}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className={styles.unreadBadge}>{conversation.unreadCount}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Область сообщений */}
        <div className={styles.messagesArea}>
          {selectedConversation ? (
            <>
              <div className={styles.messagesHeader}>
                <div className={styles.conversationAvatar}>
                  <Image 
                    src={getConversationAvatar(selectedConversation)}
                    alt={getConversationName(selectedConversation)}
                    width={40}
                    height={40}
                    className={styles.avatarImage}
                  />
                </div>
                <h3 className={styles.conversationName}>{getConversationName(selectedConversation)}</h3>
              </div>
              
              <div className={styles.messagesContent}>
                {messages.length === 0 ? (
                  <div className={styles.emptyMessages}>
                    <p>Начните беседу с {getConversationName(selectedConversation)}</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id}
                      className={`${styles.messageItem} ${message.senderId === userId ? styles.outgoingMessage : styles.incomingMessage}`}
                    >
                      <div className={styles.messageContent}>
                        <p>{message.content}</p>
                        <span className={styles.messageTime}>{formatMessageDate(message.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <form className={styles.messageForm} onSubmit={handleSendMessage}>
                <textarea
                  className={styles.messageInput}
                  placeholder="Введите сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button 
                  type="submit" 
                  className={styles.sendButton}
                  disabled={!newMessage.trim()}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <div className={styles.noActiveConversation}>
              <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
              </svg>
              <h3>Выберите беседу</h3>
              <p>Выберите беседу из списка слева или начните новую, перейдя в профиль пользователя</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 