'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const ReferralHandler = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref');

  useEffect(() => {
    if (ref) {
      console.log(`Referrer ID found: ${ref}. Saving to localStorage.`);
      localStorage.setItem('referrerId', ref);
      // Очищаем URL от ref-параметра, чтобы он не мозолил глаза
      router.replace('/', { scroll: false });
    }
  }, [ref, router]);

  return null; // Этот компонент ничего не рендерит
};

export default ReferralHandler; 