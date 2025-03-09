'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Компонент с анимацией перехода
function PageTransitionContent({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Создаем ключ для анимации на основе пути
  const routeKey = pathname + (searchParams ? `?${searchParams.toString()}` : '');

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          transition: { duration: 0.3, ease: "easeInOut" }
        }}
        exit={{ 
          opacity: 0,
          transition: { duration: 0.2, ease: "easeInOut" }
        }}
        className="page-transition-container"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Обертка с Suspense boundary
export default function PageTransition({ children }) {
  return (
    <Suspense fallback={
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100%',
          background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: 'white',
            animation: 'spin 0.8s linear infinite'
          }}/>
          <style jsx global>{`
            @keyframes spin {
              to { transform: rotate(360deg) }
            }
          `}</style>
        </div>
      </motion.div>
    }>
      <PageTransitionContent>
        {children}
      </PageTransitionContent>
    </Suspense>
  );
} 