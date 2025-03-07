import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => {
      console.log('Начало перехода между страницами');
      setIsLoading(true);
    };

    const handleComplete = () => {
      console.log('Завершение перехода между страницами');
      setIsLoading(false);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <>
      {isLoading && (
        <div className="global-loading">
          <div className="global-spinner"></div>
        </div>
      )}
      <div style={{ 
        opacity: isLoading ? 0 : 1, 
        transition: 'opacity 0.3s ease-in-out' 
      }}>
        {children}
      </div>
    </>
  );
};

export default PageTransition; 