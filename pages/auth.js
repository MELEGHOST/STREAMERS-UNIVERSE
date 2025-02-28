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
  margin-bottom: 40px;
  animation: pulse 2s infinite ease-in-out;

  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 0.8; }
  }
`;

const AuthButton = styled.button`
  background: #9147ff; /* Фиолетовый цвет Twitch */
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;
  user-select: none; /* Запрещаем выделение текста */
  -webkit-user-select: none; /* Для Safari */
  -moz-user-select: none; /* Для Firefox */
  -ms-user-select: none; /* Для Edge */

  &:hover {
    background: #7a39cc; /* Темнее при наведении */
    transform: scale(1.05);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 8px rgba(145, 71, 255, 0.5);
  }

  &:active {
    transform: scale(0.98);
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
      ${Array.from({ length: 50 }, () => `${Math.random() * 100}vw ${Math.random() * 100}vh #fff`).join(',')};
    animation: twinkle 3s infinite alternate;
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
      await loginWithTwitch();
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      alert('Не удалось войти через Twitch. Попробуй позже.');
    }
  };

  return (
    <Container>
      <Stars /> {/* Метеоры/звёзды по всему экрану */}
      <Logo src="/logo.png" alt="Streamers Universe" /> {/* Укажи путь к своему лого */}
      <AuthButton onClick={handleLogin}>Войти через Twitch</AuthButton>
    </Container>
  );
}
