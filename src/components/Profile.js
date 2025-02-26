// Профиль пользователя
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Layout from './Layout';

const Profile = () => {
  // Получаем данные пользователя, профили и функции авторизации
  const { currentUser, isStreamer, profiles, logout, switchProfile } = useAuth();
  const router = useRouter();
  const [showProfileSwitch, setShowProfileSwitch] = useState(false); // Состояние для показа выбора профилей

  useEffect(() => {
    // Если пользователь не авторизован, перенаправляем на страницу авторизации
    if (typeof window !== 'undefined' && !currentUser) {
      router.push('/');
      console.log('Redirecting to / due to no currentUser'); // Отладка
    }
  }, [currentUser, router]);

  if (!currentUser) return (
    <Layout>
      <div>Пожалуйста, войдите, чтобы продолжить</div>
    </Layout>
  );

  // Функция для открытия модального окна выбора профиля
  const handleSwitchProfile = () => {
    console.log('Opening profile switch menu, profiles:', profiles); // Отладка
    setShowProfileSwitch(true);
  };

  // Функция для выбора профиля
  const handleSelectProfile = (profileId) => {
    switchProfile(profileId);
    setShowProfileSwitch(false);
    console.log('Selected profile with ID:', profileId); // Отладка
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
        {showProfileSwitch && (
          <div className="profile-switch-modal">
            <h3>Выберите профиль</h3>
            {profiles.map((profile) => (
              <button 
                key={profile.id} 
                onClick={() => handleSelectProfile(profile.id)}
                className="profile-switch-btn"
              >
                {profile.isStreamer ? `Стример: ${profile.name}` : `Подписчик: ${profile.name}`}
              </button>
            ))}
            <button onClick={() => setShowProfileSwitch(false)}>Отмена</button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
