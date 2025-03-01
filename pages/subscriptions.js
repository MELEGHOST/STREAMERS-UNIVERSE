import React, { useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import styled from 'styled-components';

const SubscriptionsContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  max-width: 800px;
  margin: 20px auto;
  color: #333;
`;

export default function Subscriptions() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) window.location.href = '/auth';
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const subscriptions = JSON.parse(localStorage.getItem(`follows_${user.id}`)) || [];

  return (
    <SubscriptionsContainer>
      <h1>Мои подписки</h1>
      {subscriptions.length > 0 ? (
        subscriptions.map((streamer, index) => (
          <p key={index}>{streamer.name} (Twitch ID: {streamer.id})</p>
        ))
      ) : (
        <p>У вас нет подписок</p>
      )}
    </SubscriptionsContainer>
  );
}
