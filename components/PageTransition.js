'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

// Компонент с хуком useSearchParams, требующий Suspense boundary
function PageTransitionContent({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Создаем ключ для анимации на основе пути и параметров запроса
  const routeKey = pathname + (searchParams ? `?${searchParams.toString()}` : '');

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Обертка с Suspense boundary
export default function PageTransition({ children }) {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <PageTransitionContent>
        {children}
      </PageTransitionContent>
    </Suspense>
  );
} 