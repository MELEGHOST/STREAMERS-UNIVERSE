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
  const [questionPrice, setQuestionPrice] = useState(10);
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

  // Initialize StreamCoins from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isAuthenticated && user?.id) {
      const userId = user.id;
      const savedCoins = localStorage.getItem(`streamCoins_${userId}`);
      if (savedCoins) {
        setStreamCoins(JSON.parse(savedCoins));
      }
    }
  }, [isAuthenticated, user]);

  // Effect to check if user is authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, loading, router]);

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
    if (!user?.id) return;
    
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
          }
        ]
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
    if (!user?.id) return;
    
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
        }
      ]
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

  const isStreamer = user?.isStreamer || false;

  return (
    <ProfileContainer>
      <h1>Профиль: {user.name}</h1>
      <p>Followers: {user.followers || 0
