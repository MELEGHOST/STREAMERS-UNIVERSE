'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const ReferralHandler = () => {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  useEffect(() => {
    if (ref) {
      console.log(`Referrer ID found: ${ref}. Saving to localStorage.`);
      try {
        localStorage.setItem('referrerId', ref);
      } catch (e) {
        console.error('LocalStorage error:', e);
      }
    }
  }, [ref]);

  return null; // Этот компонент ничего не рендерит
};

export default ReferralHandler; 