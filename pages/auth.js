const React = require('react');
const { useAuth } = require('../src/context/AuthContext');
const { useRouter } = require('next/router');
const styled = require('styled-components').default;

const Container = styled.div`
  background: #1a1a4a; /* Глубокий тёмно-синий фон без градиента для простоты */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Arial', sans-serif;
  overflow: hidden;
  position: relative;
`;

const Logo = styled.img`
  max-width: 250px;
  margin-bottom: 60px; /* Лого выше кнопки */
`;

const AuthButton = styled.button`
  background: #9147ff; /* Фиолетовый цвет Twitch, как на фото */
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  border: none;
  padding: 12px 24px;
  border-radius: 25px; /* Круглая форма, как на фото */
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
  
  &:hover {
    background: #7a39cc; /* Темнее при наведении */
    transform: scale(1.05); /* Лёгкое увеличение */
    box-shadow: 0 0 15px rgba(145, 71, 255, 0.5); /* Мягкое свечение */
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 15px rgba(145, 71, 255, 0.8); /* Сильное свечение при фокусе */
  }
  
  &:active {
    transform: scale(0.98); /* Сжатие при клике */
    box-shadow: none;
  }
`;

const Stars = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: transparent;

  &::before {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    box-shadow: 
      50px 30px #fff, 150px 70px #fff, 200px 120px #fff, 300px 90px #fff, 
      400px 150px #fff, 450px 200px #fff, 100px 250px #fff, 250px 300px #fff, 
      350px 350px #fff, 500px 50px #fff, 600px 180px #fff, 700px 220px #fff;
    animation: twinkle 3s infinite alternate; /* Замедлили анимацию */
  }

  &::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    box-shadow: 
      80px 60px #fff, 180px 110px #fff, 230px 160px #fff, 330px 130px #fff, 
      430px 190px #fff, 480px 240px #fff, 130px 280px #fff, 280px 330px #fff, 
      380px 380px #fff, 530px 90px #fff, 630px 210px #fff, 730px 250px #fff;
    animation: twinkle 3s infinite alternate 1.5s; /* Замедлили и сдвинули анимацию */
  }

  & .meteor {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 10px #fff;
    animation: meteor 8s linear infinite; /* Замедлили анимацию метеоров */
  }

  @keyframes twinkle {
    from { opacity: 0.4; }
    to { opacity: 0.9; }
  }

  @keyframes meteor {
    0% { transform: translateX(100vw) translateY(-100px); opacity: 0; }
    50% { transform: translateX(-50vw) translateY(50vh); opacity: 1; }
    100% { transform: translateX(-100vw) translateY(100vh); opacity: 0; }
  }
`;

function Auth() {
  const { loginWithTwitch } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      console.log('Initiating Twitch login');
      const response = await fetch('/api/auth/twitch', { method: 'GET' });
      if (response.ok) {
        const { url } = await response.json();
        console.log('Twitch auth URL:', url);
        window.location.href = url;
      } else {
        console.error('Failed to initiate Twitch login:', await response.text());
        throw new Error('Failed to initiate Twitch login');
      }
    } catch (error) {
      console.error('Error initiating Twitch login:', error);
    }
  };

  React.useEffect(() => {
    // Генерируем несколько метеоров для анимации
    const stars = document.querySelector('.stars');
    for (let i = 0; i < 10; i++) { // Увеличил количество метеоров до 10
      const meteor = document.createElement('div');
      meteor.className = 'meteor';
      meteor.style.setProperty('--i', `${i * 0.8}s`); // Разные задержки для метеоров
      stars.appendChild(meteor);
    }
  }, []);

  return React.createElement(
    Container,
    null,
    [
      React.createElement(Stars, { className: 'stars' }),
      React.createElement(Logo, { src: '/logo.png', alt: 'Streamers Universe Logo' }),
      React.createElement(AuthButton, { onClick: handleLogin }, 'Войти через Twitch')
    ]
  );
}

module.exports = Auth;
