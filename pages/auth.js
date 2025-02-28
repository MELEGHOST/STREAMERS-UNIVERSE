import { useAuth } from '../src/context/AuthContext';
import styled from 'styled-components';

const Container = styled.div`
  background: linear-gradient(to bottom, #0a0a2a, #1a1a4a); /* Тёмный космический градиент */
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
  margin-bottom: 40px; /* Отступ от кнопки */
`;

const AuthButton = styled.button`
  background: #9147ff; /* Фиолетовый цвет Twitch */
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  border: none;
  padding: 12px 24px;
  border-radius: 25px; /* Овальная форма */
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;
  
  &:hover {
    background: #7a39cc; /* Темнее при наведении */
    transform: scale(1.05); /* Лёгкое увеличение */
  }
  
  &:focus {
    outline: none; /* Убираем стандартный фокус */
    box-shadow: 0 0 8px rgba(145, 71, 255, 0.5); /* Мягкое свечение при фокусе */
  }
  
  &:active {
    transform: scale(0.98); /* Сжатие при клике */
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
      100px 50px #fff,
      200px 150px #fff,
      300px 100px #fff,
      400px 200px #fff,
      500px 50px #fff,
      150px 250px #fff,
      250px 300px #fff,
      350px 350px #fff;
    animation: twinkle 2s infinite alternate;
  }

  &::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    box-shadow:
      120px 80px #fff,
      220px 180px #fff,
      320px 130px #fff,
      420px 230px #fff,
      520px 80px #fff,
      170px 280px #fff,
      270px 330px #fff,
      370px 380px #fff;
    animation: twinkle 2s infinite alternate 1s;
  }

  @keyframes twinkle {
    from { opacity: 0.5; }
    to { opacity: 1; }
  }
`;

export default function AuthPage() {
  const { loginWithTwitch } = useAuth();

  const handleLogin = async () => {
    try {
      await loginWithTwitch(); // Функция из AuthContext для авторизации через Twitch
    } catch (error) {
      console.error('Ошибка авторизации:', error);
    }
  };

  return (
    <Container>
      <Stars /> {/* Анимация звёзд */}
      <Logo src="/logo.png" alt="Streamers Universe" /> {/* Укажи путь к своему лого */}
      <AuthButton onClick={handleLogin}>Войти через Twitch</AuthButton>
    </Container>
  );
}
