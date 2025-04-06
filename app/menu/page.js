'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link'; // Используем Link для навигации
import styles from './menu.module.css';
import { useAuth } from '../contexts/AuthContext'; 
import { debounce } from 'lodash'; // Импортируем debounce

// Компонент для отображения результата поиска
function SearchResultItem({ user }) {
    const router = useRouter();
    const handleClick = () => {
        // Переход на динамический профиль по twitch_id
        router.push(`/profile/${user.twitch_id}`); 
    };

    return (
        <div className={styles.searchResultItem} onClick={handleClick}>
             <Image 
                 src={user.avatar_url || '/images/default_avatar.png'} 
                 alt={`Аватар ${user.display_name}`}
                 width={40}
                 height={40}
                 className={styles.searchResultAvatar}
                 onError={(e) => { e.target.src = '/images/default_avatar.png'; }} 
             />
            <div className={styles.searchResultInfo}>
                 <span className={styles.searchResultName}>{user.display_name}</span>
                 <span className={styles.searchResultLogin}>@{user.login}</span>
            </div>
             {user.is_live && <span className={styles.liveBadge}>LIVE</span>}
             {!user.is_registered && <span className={styles.inviteHint}>(Пригласить)</span>} 
             {/* Можно заменить inviteHint на кнопку */} 
        </div>
    );
}

export default function MenuPage() {
  const router = useRouter();
  const { user, supabase, isLoading, isAuthenticated } = useAuth(); 
  
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Перенаправляем на /auth, если не аутентифицирован (дублируем логику из AuthContext на всякий случай)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[MenuPage] Пользователь не аутентифицирован, перенаправление на /auth');
      router.push('/auth?message=Session+expired+or+not+found');
    }
  }, [isLoading, isAuthenticated, router]);

  // Функция выхода
  const handleLogout = useCallback(async () => {
    if (isLoggingOut || !supabase) return;
    setIsLoggingOut(true);
    console.log('[MenuPage] Выход...');
    setError(null); 
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('[MenuPage] Ошибка выхода:', signOutError);
        setError(`Ошибка выхода: ${signOutError.message}`);
        setIsLoggingOut(false); 
      } else {
        console.log('[MenuPage] Выход успешен. Редирект будет обработан AuthContext.');
        // Редирект произойдет из AuthContext
      }
    } catch (criticalError) {
      console.error('[MenuPage] Критическая ошибка выхода:', criticalError);
      setError('Критическая ошибка при выходе.');
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, supabase]);

  // --- Функция поиска с Debounce ---
  const fetchSearchResults = useCallback(async (query) => {
      if (!query || query.trim().length < 2) {
          setSearchResults([]);
          setIsSearching(false);
          setSearchError(null);
          return;
      }
      console.log('[MenuPage] Searching for:', query);
      setIsSearching(true);
      setSearchError(null);
      try {
          const response = await fetch(`/api/search/users?query=${encodeURIComponent(query)}`, {
               headers: {
                  // Передаем токен, если пользователь авторизован
                  ...(isAuthenticated && { 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}` })
               }
          });
          if (!response.ok) {
               const errorData = await response.json();
              throw new Error(errorData.error || `Ошибка поиска: ${response.status}`);
          }
          const data = await response.json();
          setSearchResults(data);
          console.log('[MenuPage] Search results:', data);
      } catch (error) {
          console.error('[MenuPage] Search error:', error);
          setSearchError(error.message);
          setSearchResults([]); // Очищаем результаты при ошибке
      } finally {
          setIsSearching(false);
      }
  }, [isAuthenticated, supabase]); // Зависимости useCallback

  // Создаем debounce-версию функции поиска
  const debouncedSearch = useCallback(debounce(fetchSearchResults, 500), [fetchSearchResults]); // 500ms задержка

  // Обработчик изменения поля ввода
  const handleSearchChange = (event) => {
      const newSearchTerm = event.target.value;
      setSearchTerm(newSearchTerm);
      // Вызываем debounce-функцию
      debouncedSearch(newSearchTerm);
  };

  // Данные для отображения
  const displayName = user?.user_metadata?.full_name || user?.email || 'Загрузка...';
  // Пытаемся получить аватар из Twitch метаданных, если нет - дефолтный
  const avatarUrl = user?.user_metadata?.avatar_url || '/images/default_avatar.png'; 

  // Показываем индикатор загрузки, пока AuthContext проверяет сессию
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}> 
        <div className="spinner"></div>
        <p>Загрузка меню...</p>
      </div>
    );
  }

  // Если не аутентифицирован после загрузки
  if (!isAuthenticated) {
     return (
      <div className={styles.loadingContainer}>
        <p>Перенаправление на страницу входа...</p>
      </div>
    );
  }

  // --- Основная разметка меню --- 
  return (
    <div className={styles.container}>
      {/* Шапка с информацией о пользователе */} 
      <header className={styles.header}>
        <Link href="/profile" className={styles.userInfo}>
          <Image 
            src={avatarUrl}
            alt="Аватар" 
            width={50} 
            height={50} 
            className={styles.avatar} 
            onError={(e) => { e.target.src = '/images/default_avatar.png'; }} // Запасной путь при ошибке
            priority
          />
          <span className={styles.userName}>{displayName}</span>
        </Link>
        {/* Поле поиска */} 
        <div className={styles.searchContainer}>
            <input 
                type="text"
                placeholder="Поиск стримеров на Twitch..."
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
            />
             {/* Индикатор загрузки поиска */} 
             {isSearching && <div className={`spinner ${styles.searchSpinner}`}></div>}
             {/* Отображение результатов поиска */} 
             {searchTerm.length >= 2 && !isSearching && (searchResults.length > 0 || searchError) && (
                 <div className={styles.searchResultsDropdown}>
                     {searchError && <div className={styles.searchError}>{searchError}</div>}
                     {searchResults.length > 0 ? (
                         searchResults.map(userResult => ( 
                             <SearchResultItem key={userResult.twitch_id} user={userResult} />
                         ))
                     ) : (
                         !searchError && <div className={styles.noResults}>Ничего не найдено.</div>
                     )}
                 </div>
             )}
        </div>
        {/* Место для доп. инфо (коины, админ-статус) */} 
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>} 

      {/* Навигация */} 
      <nav className={styles.navigation}>
        <ul>
          <li><Link href="/profile">Профиль</Link></li>
          <li><Link href="/search">Поиск</Link></li>
          <li><Link href="/followings">Вдохновители</Link></li>
          <li><Link href="/followers">Последователи</Link></li>
          <li><Link href="/reviews">Обзоры</Link></li>
          <li><Link href="/settings">Настройки</Link></li>
          {/* Ссылку на админку добавим позже с проверкой прав */} 
        </ul>
      </nav>

      {/* Кнопка выхода */} 
      <footer className={styles.footer}>
        <button 
          onClick={handleLogout}
          className={styles.logoutButton}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Выход...' : 'Выйти'}
        </button>
      </footer>
    </div>
  );
} 