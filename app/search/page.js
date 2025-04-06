'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext'; // Путь к контексту
import styles from './search.module.css'; // Стили для этой страницы
import pageStyles from '../../styles/page.module.css'; // Общие стили
import { debounce } from 'lodash';

// Компонент для отображения результата поиска
function SearchResultItem({ user }) {
    const router = useRouter();
    const handleClick = () => {
        router.push(`/profile/${user.twitch_id}`);
    };

    return (
        <div className={styles.searchResultItem} onClick={handleClick}>
             <Image 
                 src={user.avatar_url || '/images/default_avatar.png'} 
                 alt={`Аватар ${user.display_name}`}
                 width={50} // Увеличим немного
                 height={50}
                 className={styles.searchResultAvatar}
                 onError={(e) => { e.target.src = '/images/default_avatar.png'; }} 
             />
            <div className={styles.searchResultInfo}>
                 <span className={styles.searchResultName}>{user.display_name}</span>
                 <span className={styles.searchResultLogin}>@{user.login}</span>
            </div>
            <div className={styles.searchResultStatus}>
                 {user.is_live && <span className={styles.liveBadge}>LIVE</span>}
                 {user.is_registered && <span className={styles.registeredBadge}>✔️ В Universe</span>}
                 {!user.is_registered && 
                     <a href={`https://twitch.tv/${user.login}`} target="_blank" rel="noopener noreferrer" className={styles.inviteButton}>
                         👋 Пригласить
                     </a>
                 } 
             </div>
        </div>
    );
}

export default function SearchPage() {
    const router = useRouter();
    const { isAuthenticated, supabase } = useAuth(); // Получаем только то, что нужно
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

    // Функция поиска (перенесена сюда)
    const fetchSearchResults = async (query) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            setSearchError(null);
            return;
        }
        console.log('[SearchPage] Searching for:', query);
        setIsSearching(true);
        setSearchError(null);
        try {
            const response = await fetch(`/api/search/users?query=${encodeURIComponent(query)}`, {
                headers: {
                    ...(isAuthenticated && { 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}` })
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Ошибка поиска: ${response.status}`);
            }
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('[SearchPage] Search error:', error);
            setSearchError(error.message);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const debouncedSearchRef = useRef(
        debounce((query) => { fetchSearchResults(query); }, 500)
    );

    const handleSearchChange = (event) => {
        const newSearchTerm = event.target.value;
        setSearchTerm(newSearchTerm);
        debouncedSearchRef.current(newSearchTerm);
    };

    return (
        <div className={pageStyles.container}> 
            <h1 className={styles.title}>Поиск пользователей</h1>
            
            <div className={styles.searchBarContainer}>
                <input 
                    type="text"
                    placeholder="Введите ник на Twitch..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className={styles.searchInput}
                    autoFocus // Ставим фокус при загрузке
                />
                {isSearching && <div className={`spinner ${styles.searchSpinner}`}></div>}
            </div>

            <div className={styles.resultsContainer}>
                {searchError && <div className={pageStyles.errorMessage}>{searchError}</div>}
                {!isSearching && searchTerm.length > 0 && searchResults.length === 0 && !searchError && (
                    <div className={styles.noResults}>Пользователи не найдены.</div>
                )}
                {searchResults.map(userResult => (
                    <SearchResultItem key={userResult.twitch_id} user={userResult} />
                ))}
            </div>

            <button onClick={() => router.back()} className={pageStyles.backButton} style={{ marginTop: '2rem' }}>
                &larr; Назад
            </button>
        </div>
    );
} 