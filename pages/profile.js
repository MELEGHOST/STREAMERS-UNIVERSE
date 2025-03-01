"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import styles from './profile.module.css';
import { useRouter } from 'next/router';

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
  const [socialLinks, setSocialLinks] = useState({
    twitter: '',
    instagram: '',
    discord: '',
    youtube: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && isAuthenticated && user?.id) {
      const userId = user.id;
      const savedCoins = localStorage.getItem(`streamCoins_${userId}`);
      const savedSocials = localStorage.getItem(`socialLinks_${userId}`);
      if (savedCoins) setStreamCoins(JSON.parse(savedCoins));
      if (savedSocials) setSocialLinks(JSON.parse(savedSocials));
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/auth');
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      const initData = window.Telegram.WebApp.initDataUnsafe || {};
      console.log('Telegram initData in Profile:', initData);
    }
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (!isAuthenticated || !user) return <div>Пожалуйста, авторизуйтесь</div>;

  const isStreamer = user?.isStreamer || false;

  const handleAddStream = () => {
    if (selectedDate && description) {
      setStreamSchedule([...streamSchedule, { date: selectedDate, description }]);
      setSelectedDate('');
      setDescription('');
    }
  };

  const handleVote = (date, vote) => console.log(`Vote for ${date}: ${vote}`);

  const handleRateStreamer = (value) => {
    setRating(value);
    console.log(`Rated streamer: ${value}`);
    if (value >= 4) unlockFeature('Exclusive Badge');
  };

  const unlockFeature = (feature) => console.log(`Unlocked feature: ${feature}`);

  const handleAskQuestion = () => {
    if (streamCoins.balance >= questionPrice) {
      const updatedCoins = {
        ...streamCoins,
        balance: streamCoins.balance - questionPrice,
        totalSpent: streamCoins.totalSpent + questionPrice,
        transactions: [...streamCoins.transactions, {
          id: `q_${Date.now()}_${Math.random().toString(36).substring(2,
