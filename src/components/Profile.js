// Профиль пользователя
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Layout from './Layout';

const Profile = () => {
  // Получаем данные пользователя и функции авторизации
  const { currentUser, isStreamer, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Если пользователь не авторизован, перенаправляем на страницу авторизации
    if (typeof window !== 'undefined' && !currentUser) {
      router.push('/auth');
      console.log('Redirecting to /auth due to no currentUser'); // Отладка
    }
  }, [currentUser, router]);

  if (!currentUser) return (
    <Layout>
      <div>Пожалуйста, войдите, чтобы продолжить</div>
    </Layout>
  );

  // Функция для смены профиля
  const handleSwitchProfile = async () => {
    console.log('Switching profile...'); // Отладка
    await logout(); // Сбрасываем текущую авторизацию
    localStorage.clear(); // Полная очистка localStorage для сброса всех данных
    console.log('localStorage cleared, redirecting to /auth'); // Отладка
    router.push('/auth?switch=true'); // Перенаправляем на страницу авторизации с параметром для выбора роли
  };

  return (
    <Layout>
      <div className="frame profile active">
        <div id="profileHeader">
          <h2 id="profileTitle">{isStreamer ? `Профиль стримера: ${currentUser.name}` : `Профиль подписчика: ${currentUser.name}`}</h2>
          <p id="profileInfo">{isStreamer ? `У вас ${currentUser.followers || 0} подписчиков.` : 'Вы подписчик и не имеете подписчиков.'}</p>
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
            <h3>Ваши подписки</h3>
            <div id="subscriptionsList">
              {currentUser.subscriptions && currentUser.subscriptions.length > 0 ? (
                currentUser.subscriptions.map((streamer, index) => (
                  <div key={index} className="item">{streamer}</div>
                ))
              ) : (
                <p>Вы не подписаны на стримеров</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
