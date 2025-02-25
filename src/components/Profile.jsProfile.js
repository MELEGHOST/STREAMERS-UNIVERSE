import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { currentUser, isStreamer, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return <div>Пожалуйста, авторизуйтесь</div>;

  return (
    <div className="frame profile">
      <div id="profileHeader">
        <h2 id="profileTitle">{isStreamer ? `Профиль стримера: ${currentUser.name}` : `Профиль подписчика: ${currentUser.name}`}</h2>
        <p id="profileInfo">{isStreamer ? `У вас ${currentUser.followers} подписчиков.` : 'Вы можете поддержать стримеров.'}</p>
        <button id="switchProfileBtn" onClick={() => navigate('/auth')}>Сменить профиль</button>
      </div>
      {isStreamer ? (
        <div id="streamerSection" className="profile-content">
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
        <div id="viewerSection" className="profile-content">
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
  );
};

export default Profile;
