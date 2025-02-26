import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Menu from './Menu';
import Stars from './Stars';

const Profile = () => {
  const { currentUser, isStreamer, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Если пользователь не авторизован, перенаправляем на страницу авторизации
    if (typeof window !== 'undefined' && !currentUser) {
      router.push('/auth');
    }
  }, [currentUser, router]);

  if (!currentUser) return (
    <div className="container">
      <div className="logo-container">
        <img src="/logo.png" alt="Streamers Universe Logo" className="logo" />
      </div>
      <div>Пожалуйста, авторизуйтесь</div>
      <Stars />
    </div>
  );

  return (
    <div className="container">
      <div className="logo-container">
        <img src="/logo.png" alt="Streamers Universe Logo" className="logo" />
      </div>
      <Menu />
      <div className="frame profile active">
        <div id="profileHeader">
          <h2 id="profileTitle">{isStreamer ? `Профиль стримера: ${currentUser.name}` : `Профиль подписчика: ${currentUser.name}`}</h2>
          <p id="profileInfo">{isStreamer ? `У вас ${currentUser.followers} подписчиков.` : 'Вы можете поддержать стримеров.'}</p>
          <button id="switchProfileBtn" onClick={() => router.push('/auth')}>Сменить профиль</button>
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
      <Stars />
    </div>
  );
};

export default Profile;
