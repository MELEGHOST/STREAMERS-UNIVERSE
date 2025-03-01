import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const ProfileContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 20px auto;
  color: #333;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1em;
  cursor: pointer;
  margin: 5px;

  &:hover {
    background-color: #2980b9;
  }
`;

export default function Profile() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [questionPrice, setQuestionPrice] = useState(10); // Цена вопроса в Stars
  const [streamSchedule, setStreamSchedule] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [description, setDescription] = useState('');
  const [allowedStreamers, setAllowedStreamers] = useState([]);
  const [moderators, setModerators] = useState([]);
  const [trustedFollowers, setTrustedFollowers] = useState([]);
  const [rating, setRating] = useState(0);
  const [streamerRating, setStreamerRating] = useState(0);
  const [streamCoins, setStreamCoins] = useState({
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    transactions: [],
  });

  // Initialize and sync StreamCoins with localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isAuthenticated && user?.id) {
      const userId = user.id;
      const savedCoins = localStorage.getItem(`streamCoins_${userId}`);
      if (savedCoins) {
        setStreamCoins(JSON.parse(savedCoins));
      } else {
        // Инициализируем пустые StreamCoins, если их нет
        const initialCoins = {
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          transactions: [],
        };
        setStreamCoins(initialCoins);
        localStorage.setItem(`streamCoins_${userId}`, JSON.stringify(initialCoins));
      }
    }
  }, [isAuthenticated, user?.id]);

  // Effect to check if user is authenticated and redirect
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, loading, router]);

  // Проверяем Telegram Mini App
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      const initData = window.Telegram.WebApp.initDataUnsafe || {};
      console.log('Telegram initData in Profile:', initData);
    }
  }, []);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div>Пожалуйста, авторизуйтесь</div>;
  }

  const isStreamer = user?.isStreamer || false; // Предполагаем, что user может иметь поле isStreamer

  const handleAddStream = () => {
    if (selectedDate && description) {
      setStreamSchedule([...streamSchedule, { date: selectedDate, description }]);
      setSelectedDate('');
      setDescription('');
    }
  };

  const handleVote = (date, vote) => {
    console.log(`Vote for ${date}: ${vote}`);
  };

  const handleRateStreamer = (value) => {
    setRating(value);
    console.log(`Rated streamer: ${value}`);
    if (value >= 4) unlockFeature('Exclusive Badge');
  };

  const unlockFeature = (feature) => {
    console.log(`Unlocked feature: ${feature}`);
  };

  const handleAskQuestion = () => {
    if (streamCoins.balance >= questionPrice) {
      const updatedCoins = {
        ...streamCoins,
        balance: streamCoins.balance - questionPrice,
        totalSpent: streamCoins.totalSpent + questionPrice,
        transactions: [
          ...streamCoins.transactions,
          {
            id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: user.id,
            type: 'spend',
            amount: questionPrice,
            reason: 'question',
            timestamp: new Date().toISOString(),
          },
        ],
      };
      setStreamCoins(updatedCoins);
      localStorage.setItem(`streamCoins_${user.id}`, JSON.stringify(updatedCoins));
      console.log(`Question asked: ${question} for ${questionPrice} Stars`);
      setQuestion('');
    } else {
      alert('Not enough Stars!');
    }
  };

  const handleEarnStars = () => {
    const updatedCoins = {
      ...streamCoins,
      balance: streamCoins.balance + 5,
      totalEarned: streamCoins.totalEarned + 5,
      transactions: [
        ...streamCoins.transactions,
        {
          id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          userId: user.id,
          type: 'earn',
          amount: 5,
          reason: 'ad',
          timestamp: new Date().toISOString(),
        },
      ],
    };
    setStreamCoins(updatedCoins);
    localStorage.setItem(`streamCoins_${user.id}`, JSON.stringify(updatedCoins));
    alert('Earned 5 Stars from ad!');
  };

  const handleCollaborationRequest = (streamerId) => {
    if (allowedStreamers.includes(streamerId)) {
      console.log(`Collaboration request sent to ${streamerId}`);
    } else {
      alert('This streamer is not allowed to collaborate.');
    }
  };

  return (
    <ProfileContainer>
      <h1>Профиль: {user.name}</h1>
      <p>Followers: {user.followers || 0}</p>
      <p>Role: {isStreamer ? 'Streamer' : 'Follower'}</p>
      <p>Stars: {streamCoins.balance} ⭐</p>
      {isStreamer && (
        <Section>
          <h2>Stream Schedule</h2>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Stream description"
          />
          <Button onClick={handleAddStream}>Add Stream</Button>
          {streamSchedule.map((item, index) => (
            <div key={index}>{`${item.date}: ${item.description}`}</div>
          ))}
          <h3>Viewer Voting</h3>
          {streamSchedule.map((item, index) => (
            <div key={`vote-${index}`}>
              <p>{item.date}</p>
              <Button onClick={() => handleVote(item.date, 'Yes')}>Vote Yes</Button>
              <Button onClick={() => handleVote(item.date, 'No')}>Vote No</Button>
            </div>
          ))}
          <h3>Collaborations</h3>
          <input
            type="text"
            placeholder="Streamer ID for collab"
            onChange={(e) => setAllowedStreamers([...allowedStreamers, e.target.value])}
          />
          <Button onClick={() => handleCollaborationRequest('streamer-id')}>Request Collaboration</Button>
          <h3>Moderators & Trusted Followers</h3>
          <input
            type="text"
            placeholder="Moderator ID"
            onChange={(e) => setModerators([...moderators, e.target.value])}
          />
          <input
            type="text"
            placeholder="Trusted Follower ID"
            onChange={(e) => setTrustedFollowers([...trustedFollowers, e.target.value])}
          />
        </Section>
      )}
      {!isStreamer && user.followers < 265 && (
        <Section>
          <h2>Become a Streamer</h2>
          <p>Followers needed: {265 - user.followers}</p>
          <p>Tips: Engage with your audience, stream regularly, use social media.</p>
          <p>Achievements: 50 followers – Basic Badge, 100 followers – Silver Badge</p>
        </Section>
      )}
      <Section>
        <h3>Rate Streamer</h3>
        {[1, 2, 3, 4, 5].map((star) => (
          <Button key={star} onClick={() => handleRateStreamer(star)}>⭐{star}</Button>
        ))}
        <p>Your rating: {rating}, Streamer rating: {streamerRating}</p>
      </Section>
      <Section>
        <h3>Ask a Question</h3>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Your question"
        />
        <input
          type="number"
          value={questionPrice}
          onChange={(e) => setQuestionPrice(parseInt(e.target.value) || 10)}
          min={1}
          placeholder="Stars"
        />
        <Button onClick={handleAskQuestion}>Ask</Button>
        <Button onClick={handleEarnStars}>Earn Stars (Watch Ad)</Button>
      </Section>
      <Button onClick={() => router.back()}>Back</Button> {/* Используем router.back() вместо window.history.back() */}
      <Button onClick={logout}>Logout</Button>
    </ProfileContainer>
  );
}
