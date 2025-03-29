'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './SUFollowers.module.css';
import { supabase } from '../../../lib/supabaseClient';
import MenuHeader from '@/app/components/MenuHeader';
import Footer from '@/app/components/Footer';

export default function SUFollowers() {
  const router = useRouter();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // ... остальной код ...
  
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
              <li key={follower.follower_id.id} className={styles.followerItem} onClick={() => handleFollowerClick(follower.follower_id.id)}>
                <Image 
                  src={follower.follower_id.profile_image_url || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png'}
                  alt={`Аватар ${follower.follower_id.display_name}`}
                  width={50}
                  height={50}
                  className={styles.avatar}
                />
                <div className={styles.followerInfo}>
                  <span className={styles.followerName}>{follower.follower_id.display_name}</span>
                  <span className={styles.followDate}>Подписался: {formatDate(follower.created_at)}</span>
                </div>
                {/* Добавляем бейдж "Подписан на вас" если он ваш фолловер */} 
                {follower.is_mutual && (
                  <span className={styles.mutualBadge}>Подписан на вас</span>
                )}
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
} 