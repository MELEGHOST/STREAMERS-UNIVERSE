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
          id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Исправлено: добавлена закрывающая скобка
          userId: user.id,
          type: 'spend',
          amount: questionPrice,
          reason: 'question',
          timestamp: new Date().toISOString(),
        }],
      };
      setStreamCoins(updatedCoins);
      localStorage.setItem(`streamCoins_${user.id}`, JSON.stringify(updatedCoins));
      console.log(`Question asked: ${question} for ${questionPrice} Stars`);
      setQuestion('');
    } else alert('Not enough Stars!');
  };

  const handleEarnStars = () => {
    const updatedCoins = {
      ...streamCoins,
      balance: streamCoins.balance + 5,
      totalEarned: streamCoins.totalEarned + 5,
      transactions: [...streamCoins.transactions, {
        id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Исправлено: добавлена закрывающая скобка
        userId: user.id,
        type: 'earn',
        amount: 5,
        reason: 'ad',
        timestamp: new Date().toISOString(),
      }],
    };
    setStreamCoins(updatedCoins);
    localStorage.setItem(`streamCoins_${user.id}`, JSON.stringify(updatedCoins));
    alert('Earned 5 Stars from ad!');
  };

  const handleCollaborationRequest = (streamerId) => {
    if (allowedStreamers.includes(streamerId)) console.log(`Collaboration request sent to ${streamerId}`);
    else alert('This streamer is not allowed to collaborate.');
  };

  const handleUpdateSocials = (platform, url) => {
    const updatedSocials = { ...socialLinks, [platform]: url };
    setSocialLinks(updatedSocials);
    localStorage.setItem(`socialLinks_${user.id}`, JSON.stringify(updatedSocials));
  };

  const handleOpenSocialLink = (url) => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.openLink(url);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  return (
    <div className={styles.profileContainer}>
      <h1>Профиль: {user.name}</h1>
      <p>Followers: {user.followers || 0}</p>
      <p>Role: {isStreamer ? 'Streamer' : 'Follower'}</p>
      <p>Stars: {streamCoins.balance} ⭐</p>
      {isStreamer && (
        <div className={styles.section}>
          <h2>Stream Schedule</h2>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Stream description" />
          <button className={styles.button} onClick={handleAddStream}>Add Stream</button>
          {streamSchedule.map((item, index) => <div key={index}>{`${item.date}: ${item.description}`}</div>)}
          <h3>Viewer Voting</h3>
          {streamSchedule.map((item, index) => (
            <div key={`vote-${index}`}>
              <p>{item.date}</p>
              <button className={styles.button} onClick={() => handleVote(item.date, 'Yes')}>Vote Yes</button>
              <button className={styles.button} onClick={() => handleVote(item.date, 'No')}>Vote No</button>
            </div>
          ))}
          <h3>Collaborations</h3>
          <input placeholder="Streamer ID for collab" onChange={(e) => setAllowedStreamers([...allowedStreamers, e.target.value])} />
          <button className={styles.button} onClick={() => handleCollaborationRequest('streamer-id')}>Request Collaboration</button>
          <h3>Moderators & Trusted Followers</h3>
          <input placeholder="Moderator ID" onChange={(e) => setModerators([...moderators, e.target.value])} />
          <input placeholder="Trusted Follower ID" onChange={(e) => setTrustedFollowers([...trustedFollowers, e.target.value])} />
          <h3>Социальные сети</h3>
          <input className={styles.socialInput} placeholder="Twitter" value={socialLinks.twitter} onChange={(e) => handleUpdateSocials('twitter', e.target.value)} />
          <input className={styles.socialInput} placeholder="Instagram" value={socialLinks.instagram} onChange={(e) => handleUpdateSocials('instagram', e.target.value)} />
          <input className={styles.socialInput} placeholder="Discord" value={socialLinks.discord} onChange={(e) => handleUpdateSocials('discord', e.target.value)} />
          <input className={styles.socialInput} placeholder="YouTube" value={socialLinks.youtube} onChange={(e) => handleUpdateSocials('youtube', e.target.value)} />
        </div>
      )}
      {!isStreamer && user.followers < 265 && (
        <div className={styles.section}>
          <h2>Become a Streamer</h2>
          <p>Followers needed: {265 - user.followers}</p>
          <p>Tips: Engage with your audience, stream regularly, use social media.</p>
          <p>Achievements: 50 followers – Basic Badge, 100 followers – Silver Badge</p>
        </div>
      )}
      {!isStreamer && socialLinks && Object.entries(socialLinks).length > 0 && (
        <div className={styles.section}>
          <h3>Социальные сети стримера</h3>
          {Object.entries(socialLinks).map(([platform, url]) => (
            <button className={styles.button} key={platform} onClick={() => handleOpenSocialLink(url)}>
              {platform}: {url || 'Не указана'}
            </button>
          ))}
        </div>
      )}
      <div className={styles.section}>
        <h3>Rate Streamer</h3>
        {[1, 2, 3, 4, 5].map((star) => <button className={styles.button} key={star} onClick={() => handleRateStreamer(star)}>⭐{star}</button>)}
        <p>Your rating: {rating}, Streamer rating: {streamerRating}</p>
      </div>
      <div className={styles.section}>
        <h3>Ask a Question</h3>
        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Your question" />
        <input type="number" value={questionPrice} onChange={(e) => setQuestionPrice(parseInt(e.target.value) || 10)} min={1} placeholder="Stars" />
        <button className={styles.button} onClick={handleAskQuestion}>Ask</button>
        <button className={styles.button} onClick={handleEarnStars}>Earn Stars (Watch Ad)</button>
      </div>
      <button className={styles.button} onClick={() => router.back()}>Back</button>
      <button className={styles.button} onClick={logout}>Logout</button>
    </div>
  );
}
