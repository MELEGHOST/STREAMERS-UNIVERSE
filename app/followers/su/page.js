'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './SUFollowers.module.css';
import MenuHeader from '@/app/components/MenuHeader';
import Footer from '@/app/components/Footer';

const SUFollowersPage = () => {
  const router = useRouter();
  const [followers] = useState([]);
  const [loading] = useState(true);
  const [error] = useState(null);
  const [/* currentUserId */, /* setCurrentUserId */] = useState(null);

  return (
    <div className={styles.container}>
      <MenuHeader />
      <main className={styles.mainContent}>
        <h1 className={styles.title}>Ваши подписчики на Streamers Universe</h1>
        
        {/* Блок поиска и сортировки (если будет нужен) */}
        {/* <div className={styles.controls}>
          <input 
            type="text"
            placeholder="Поиск по имени..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="desc">Сначала новые</option>
            <option value="asc">Сначала старые</option>
          </select>
        </div> */}

        {loading && <div className={styles.loading}>Загрузка подписчиков...</div>}
        {error && <div className={styles.error}>{error}</div>}
        
        {!loading && !error && followers.length === 0 && (
          <p className={styles.noFollowers}>У вас пока нет подписчиков на платформе Streamers Universe.</p>
        )}
        
        {!loading && !error && followers.length > 0 && (
          <ul className={styles.followerList}>
            {followers.map((follower) => (
              <li key={follower.id} className={styles.followerItem}>
                <Image 
                  src={follower.avatar || '/images/default-avatar.png'}
                  alt={`${follower.login || 'Пользователь'} avatar`}
                  width={40}
                  height={40}
                  className={styles.avatar}
                />
                <span>{follower.login || 'Пользователь'}</span>
                {/* Можно добавить кнопку для перехода в профиль подписчика */}
              </li>
            ))}
          </ul>
        )}
        
        {/* Добавляем кнопку "Назад" */}
        <button onClick={() => router.back()} className={styles.backButton}>
          Назад
        </button>
      </main>
      <Footer />
    </div>
  );
};

export default SUFollowersPage; 