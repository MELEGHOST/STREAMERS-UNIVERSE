'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const ReferralHandler = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref');
  const pathname = usePathname();

  useEffect(() => {
    if (ref) {
      console.log(`Referrer ID found: ${ref}. Saving to localStorage.`);
      try {
        localStorage.setItem('referrerId', ref);
      } catch (e) {
        console.error('LocalStorage error:', e);
      }
      // Удаляем редирект на главную страницу во время реферальной регистрации
      // Просто сохраняем referrerId для поздней обработки в AuthContext
    }
  }, [ref, pathname, searchParams]);

  return null; // Этот компонент ничего не рендерит
};

export default ReferralHandler; 