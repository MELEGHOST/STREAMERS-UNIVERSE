'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CyberAvatar from '../../components/CyberAvatar';
// ... другие импорты ...

// ... функции ...

export default function UserProfilePage() {
  // ...
  const { user, isLoading: authLoading, isAuthenticated, supabase } = useAuth();
  // const currentUserId = user?.id; // НЕ ИСПОЛЬЗУЕТСЯ
  const currentUserTwitchId = user?.user_metadata?.provider_id;
  const isOwnProfile = currentUserTwitchId === profileTwitchId;
  // ... состояния ...

  // ... loadProfileData ...

  // ... handleLogout ...

  // ... данные для рендера ...

  // ... renderProfileActionButton ...

  // --- Отображение --- 
  // ...

      {/* Секция видео (VODs) */} 
      {videos && videos.length > 0 && (
          <div className={styles.videosSection}>
              <h2 className={styles.sectionTitle}>Последние видео (VODs)</h2>
              <div className={styles.videosGrid}>
                  {videos.map(video => (
                      <a key={video.id} href={video.url} target="_blank" rel="noopener noreferrer" className={styles.videoCard}>
                          <Image
                              src={video.thumbnail_url.replace('%{width}', '320').replace('%{height}', '180')}
                              alt={`Превью видео ${video.title}`}
                              width={320}
                              height={180}
                              className={styles.videoThumbnail}
                              onError={(e) => { e.target.style.display = 'none'; }}
                              unoptimized
                          />
                          <div className={styles.videoInfo}>
                          {/* ... */}
                          </div>
                      </a>
                  ))}
              </div>
          </div>
      )}
// ...
} 