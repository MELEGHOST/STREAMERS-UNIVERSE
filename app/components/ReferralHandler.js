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
      localStorage.setItem('referrerId', ref);
      if (pathname !== '/menu' || searchParams.get('freshLogin') !== 'true') {
        router.replace('/', { scroll: false });
      }
    }
  }, [ref, router, pathname, searchParams]);

  return null; // Этот компонент ничего не рендерит
};

export default ReferralHandler; 