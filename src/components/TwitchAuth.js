import React from 'react';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';

const Container = styled.div`
  background: linear-gradient(to bottom, #0a0a2a, #1a1a4a);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Arial', sans-serif;
  overflow: hidden;
`;

const AuthButton = styled.button`
  background: #9147ff;
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;

  &:hover {
    background: #7a39cc;
    transform: scale(1.05);
  }
`;

export default function TwitchAuth() {
  const { loginWithTwitch, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (isAuthenticated) {
    return <div>Вы уже авторизованы!</div>;
  }

  return (
    <Container>
      <AuthButton onClick={loginWithTwitch}>Войти через Twitch</AuthButton>
    </Container>
  );
}
