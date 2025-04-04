import { useRouter } from 'next/router';
// import styles from '../styles/404.module.css'; // Удаляем импорт отсутствующего файла стилей

export default function Custom404() {
  const router = useRouter();

  // console.error('Ошибка 404: Страница не найдена', {
  //   path: router.asPath,
  //   query: router.query
  // });

  // Функция для возврата на главную страницу
  const goToHome = () => {
    router.push('/menu');
  };

  // Функция для возврата на предыдущую страницу
  const goBack = () => {
    router.back();
  };

  // Используем инлайновые стили, которые уже есть
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #1e133a, #3b217a)', // Градиент фона
      color: '#fff',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* <div className={styles.stars} /> // Удаляем использование класса */}
      <div style={{
        padding: '40px',
        background: 'rgba(255, 255, 255, 0.1)', // Полупрозрачный фон
        borderRadius: '10px',
        textAlign: 'center',
        maxWidth: '500px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(5px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <h1 style={{ color: '#ff6b81', marginBottom: '20px', textAlign: 'center' }}>
          404 - Страница не найдена
        </h1>
        <p style={{ color: '#fff', marginBottom: '30px', textAlign: 'center' }}>
          Упс! Страница, которую вы ищете, не существует или была перемещена.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <button
            onClick={goBack}
            style={{
              background: 'transparent',
              border: '2px solid #ff6b81',
              color: '#ff6b81',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            Вернуться назад
          </button>
          <button
            onClick={goToHome}
            style={{
              background: '#ff6b81',
              border: 'none',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  );
} 