'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Layout from './Layout';

const Profile = () => {
  const { currentUser, isStreamer, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is not authenticated, redirect to auth page
    if (typeof window !== 'undefined' && !currentUser) {
      router.push('/auth');
    }
  }, [currentUser, router]);

  if (!currentUser) return (
    <Layout>
      <div>Пожалуйста, войдите, чтобы продолжить</div>
    </Layout>
  );

  const handleSwitchProfile = async () => {
    await logout(); // Сбрасываем текущую авторизацию
    localStorage.removeItem('user'); // Удаляем данные пользователя
    localStorage.removeItem('token'); // Удаляем токен
    router.push('/auth?switch=true'); // Перенаправляем на страницу авторизации с параметром для выбора роли
  };

  return (
    <Layout>
      <div className="frame profile active">
        <div id="profileHeader">
          <h2 id="profileTitle">{isStreamer ? `Профиль стримера: ${currentUser.name}` : `Профиль подписчика: ${currentUser.name}`}</h2>
          <p id="profileInfo">{isStreamer ? `У вас ${currentUser.followers || 0} подписчиков.` : 'Вы можете поддержать стримеров.'}</p>
          <button id="switchProfileBtn" onClick={handleSwitchProfile}>Сменить профиль</button>
          <button id="logoutBtn" onClick={logout}>Выйти</button>
        </div>
        {isStreamer ? (
          <div id="streamerSection" className="profile-content active">
            <button id="addSchedule">Добавить стрим</button>
            <button id="addMovie">Добавить фильм</button>
            <button id="addGame">Добавить игру</button>
            <button id="addSocial">Добавить соцсеть</button>
            <button id="addReview">Добавить отзыв</button>
            <button id="donateBtn">Настроить донат</button>
            <button id="requestCollabBtn">Настроить запросы коллабов</button>
            <h3>Расписание стримов</h3>
            <div id="scheduleList"></div>
            <h3>Просмотренные фильмы</h3>
            <div id="movieList"></div>
            <h3>Игры</h3>
            <div id="gameList"></div>
            <h3>Соцсети</h3>
            <div id="socialLinks"></div>
            <h3>Отзывы и тир-листы</h3>
            <div id="reviewList"></div>
          </div>
        ) : (
          <div id="viewerSection" className="profile-content active">
            <button id="viewSchedule">Посмотреть расписание</button>
            <button id="viewMovies">Посмотреть фильмы</button>
            <button id="viewGames">Посмотреть игры</button>
            <button id="viewSocials">Посмотреть соцсети</button>
            <button id="askQuestionBtn">Задать вопрос</button>
            <button id="voteScheduleBtn">Проголосовать за стрим</button>
            <button id="donate">Поддержать стримера</button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
