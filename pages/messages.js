import { useState, useEffect } from 'react';
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
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState({});
  
  // Загружаем беседы пользователя
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    
    const fetchConversations = async () => {
      try {
        setLoading(true);
        
        // Получаем беседы пользователя
        const response = await fetch(`/api/messages?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить беседы');
        }
        
        const data = await response.json();
        setConversations(data.messages || []);
        
        // Если есть беседы, загружаем информацию о пользователях
        if (data.messages && data.messages.length > 0) {
          const userIds = new Set();
          
          data.messages.forEach(conv => {
            conv.participants.forEach(participantId => {
              if (participantId !== userId) {
                userIds.add(participantId);
              }
            });
          });
          
          // Загружаем информацию о пользователях
          await Promise.all(Array.from(userIds).map(async (id) => {
            try {
              const userResponse = await fetch(`/api/twitch/user?id=${id}`);
              if (userResponse.ok) {
                const userData = await userResponse.json();
                setUsers(prev => ({
                  ...prev,
                  [id]: userData
                }));
              }
            } catch (err) {
              console.error(`Ошибка при загрузке данных пользователя ${id}:`, err);
            }
          }));
        }
      } catch (err) {
        console.error('Ошибка при загрузке бесед:', err);
        setError('Не удалось загрузить беседы. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, [isAuthenticated, userId]);
  
  // Загружаем сообщения активной беседы
  useEffect(() => {
    if (!activeConversation) return;
    
    const fetchMessages = async () => {
      try {
        // Получаем сообщения беседы
        const response = await fetch(`/api/messages?userId=${userId}&conversationId=${activeConversation.id}`);
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить сообщения');
        }
        
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Отмечаем сообщения как прочитанные
        await fetch('/api/messages', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            conversationId: activeConversation.id
          })
        });
      } catch (err) {
        console.error('Ошибка при загрузке сообщений:', err);
      }
    };
    
    fetchMessages();
  }, [activeConversation, userId]);
  
  // Отправка нового сообщения
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation) return;
    
    try {
      // Определяем получателя (не текущий пользователь)
      const receiverId = activeConversation.participants.find(id => id !== userId);
      
      // Отправляем запрос на создание сообщения
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: userId,
          receiverId,
          content: newMessage
        })
      });
      
      if (!response.ok) {
        throw new Error('Не удалось отправить сообщение');
      }
      
      const data = await response.json();
      
      // Добавляем новое сообщение в список
      setMessages(prev => [...prev, data.message]);
      
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
    const otherUser = users[otherUserId];
    
    return otherUser ? otherUser.display_name : `Пользователь ${otherUserId}`;
  };
  
  // Получаем аватар пользователя для отображения в беседе
  const getConversationAvatar = (conversation) => {
    if (!conversation) return '/images/default-avatar.png';
    
    const otherUserId = conversation.participants.find(id => id !== userId);
    const otherUser = users[otherUserId];
    
    return otherUser && otherUser.profile_image_url ? otherUser.profile_image_url : '/images/default-avatar.png';
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
          
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Загрузка бесед...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className={styles.retryButton}>
                Повторить
              </button>
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
                  className={`${styles.conversationItem} ${activeConversation && activeConversation.id === conversation.id ? styles.activeConversation : ''}`}
                  onClick={() => setActiveConversation(conversation)}
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
          {activeConversation ? (
            <>
              <div className={styles.messagesHeader}>
                <div className={styles.conversationAvatar}>
                  <Image 
                    src={getConversationAvatar(activeConversation)}
                    alt={getConversationName(activeConversation)}
                    width={40}
                    height={40}
                    className={styles.avatarImage}
                  />
                </div>
                <h3 className={styles.conversationName}>{getConversationName(activeConversation)}</h3>
              </div>
              
              <div className={styles.messagesContent}>
                {messages.length === 0 ? (
                  <div className={styles.emptyMessages}>
                    <p>Начните беседу с {getConversationName(activeConversation)}</p>
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