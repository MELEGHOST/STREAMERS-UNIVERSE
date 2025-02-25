// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
console.log('Telegram Web App инициализирован:', tg.initDataUnsafe);

// Данные пользователя
let user = JSON.parse(localStorage.getItem('user')) || { role: null, twitchId: null, followers: 0, name: null };
let movies = JSON.parse(localStorage.getItem('movies')) || [];
let games = JSON.parse(localStorage.getItem('games')) || [];
let socials = JSON.parse(localStorage.getItem('socials')) || [];
let reviews = JSON.parse(localStorage.getItem('reviews')) || [];
let schedule = JSON.parse(localStorage.getItem('schedule')) || [];

// Секреты из Vercel
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI || '';

if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
    console.error('Ошибка: отсутствуют TWITCH_CLIENT_ID или TWITCH_REDIRECT_URI в Vercel secrets');
    alert('Ошибка: настройки Twitch не найдены. Регистрация недоступна.');
    showFallbackUI(); // Показываем базовый интерфейс
} else {
    initializeApp(); // Полная инициализация
}

function showFallbackUI() {
    console.log('Показ базового интерфейса без Twitch...');
    showFrame('authFrame');
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
}

function initializeApp() {
    console.log('Инициализация приложения...');
    if (!user.role) {
        showFrame('authFrame'); // Показываем экран авторизации
        showMenu(false); // Скрываем меню
    } else {
        showMenu(true); // Показываем меню
        showProfile(); // Показываем профиль
    }
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
}

function showFrame(frameId) {
    const frames = document.querySelectorAll('.frame');
    frames.forEach(frame => frame.classList.remove('active', 'hidden'));
    const activeFrame = document.getElementById(frameId);
    activeFrame.classList.add('active');
    frames.forEach(frame => frame.classList.add('hidden')); // Скрываем все, кроме активного
    activeFrame.classList.remove('hidden'); // Показываем активный
    console.log(`Показан фрейм: ${frameId}`);
}

function showMenu(show) {
    const menu = document.getElementById('mainMenu');
    if (show) {
        menu.classList.add('active');
        menu.classList.remove('hidden');
    } else {
        menu.classList.remove('active');
        menu.classList.add('hidden');
    }
    console.log(`Меню ${show ? 'показано' : 'скрыто'}`);
}

function ensureButtonsVisible() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.display = 'inline-block';
        btn.style.opacity = '1';
        btn.style.visibility = 'visible';
        btn.disabled = false; // Убеждаемся, что кнопки кликабельны
    });
    console.log('Кнопки сделаны видимыми и кликабельными');
}

function showProfile() {
    showFrame('profileFrame');
    const streamerSection = document.getElementById('streamerSection');
    const viewerSection = document.getElementById('viewerSection');
    const profileTitle = document.getElementById('profileTitle');
    const profileInfo = document.getElementById('profileInfo');

    if (user.role === 'streamer') {
        streamerSection.classList.add('active');
        viewerSection.classList.remove('active');
        profileTitle.textContent = `Профиль стримера: ${user.name}`;
        profileInfo.textContent = `У вас ${user.followers} подписчиков.`;
        console.log('Показан профиль стримера');
    } else {
        streamerSection.classList.remove('active');
        viewerSection.classList.add('active');
        profileTitle.textContent = `Профиль подписчика: ${user.name}`;
        profileInfo.textContent = 'Вы можете поддержать стримеров.';
        console.log('Показан профиль подписчика');
    }
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
}

// Навигация через меню
document.getElementById('goToProfile').addEventListener('click', () => showProfile());
document.getElementById('goToTwitch').addEventListener('click', () => showFrame('twitchFrame'));
document.getElementById('goToTop').addEventListener('click', () => showFrame('topFrame'));

// Выход
document.getElementById('logoutBtn').addEventListener('click', () => {
    user = { role: null, twitchId: null, followers: 0, name: null };
    localStorage.clear(); // Полная очистка
    movies = []; games = []; socials = []; reviews = []; schedule = [];
    showFrame('authFrame');
    showMenu(false);
    ensureButtonsVisible();
    console.log('Выход выполнен, показан экран авторизации');
});

// Авторизация через Twitch
document.getElementById("authorize-btn").addEventListener("click", function() {
    const username = document.getElementById("twitch-username").value;
    if (username) {
        // Перенаправление на Twitch для аутентификации
        window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=user:read:email&state=${username}`;
    } else {
        alert("Пожалуйста, введите ваш Twitch никнейм!");
    }
});
    const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=token&scope=user:read:follows`;
    console.log('Перенаправление на Twitch:', TWITCH_AUTH_URL);
    window.location.href = TWITCH_AUTH_URL;
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
});

function showError(message) {
    const error = document.getElementById('authError');
    error.textContent = message;
    error.classList.add('active');
    setTimeout(() => error.classList.remove('active'), 3000); // Скрываем через 3 секунды
    console.log('Показана ошибка:', message);
}

function handleTwitchAuth() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
        console.log('Получен токен:', accessToken);
        fetch('https://api.twitch.tv/helix/users', {
            headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
        })
        .then(response => response.json())
        .then(data => {
            if (data.data && data.data.length > 0) {
                const twitchUser = data.data[0];
                user.twitchId = twitchUser.login;
                user.name = twitchUser.display_name || twitchUser.login; // Сохраняем имя пользователя

                fetch(`https://api.twitch.tv/helix/users/follows?to_id=${twitchUser.id}`, {
                    headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
                })
                .then(response => response.json())
                .then(followsData => {
                    user.followers = followsData.total || 0;
                    if (user.followers >= 265 || user.role === 'viewer') { // Проверяем только для стримера
                        user.role = user.followers >= 265 ? 'streamer' : 'viewer';
                        localStorage.setItem('user', JSON.stringify(user));
                        showMenu(true); // Показываем меню после авторизации
                        showProfile(); // Показываем профиль
                        console.log(`${user.role === 'streamer' ? 'Стример' : 'Подписчик'} зарегистрирован:`, user.name, user.followers, 'подписчиков');
                    } else {
                        showError('У вас меньше 265 подписчиков для регистрации как стример. Вы зарегистрированы как подписчик.');
                        user.role = 'viewer'; // Регистрируем как подписчика
                        localStorage.setItem('user', JSON.stringify(user));
                        showMenu(true); // Показываем меню
                        showProfile(); // Показываем профиль подписчика
                    }
                })
                .catch(error => {
                    showError('Ошибка проверки подписчиков: ' + error.message);
                    console.error('Ошибка проверки подписчиков:', error);
                });
            } else {
                showError('Пользователь Twitch не найден');
                console.error('Пользователь Twitch не найден');
            }
            ensureButtonsVisible(); // Убеждаемся, что кнопки видны
        })
        .catch(error => {
            showError('Ошибка авторизации Twitch: ' + error.message);
            console.error('Ошибка авторизации Twitch:', error);
        });
    }
}

// Добавление расписания (только для стримера)
document.getElementById('addSchedule').addEventListener('click', () => {
    if (user.role !== 'streamer') return alert('Только стримеры могут добавлять расписание');
    let time = prompt('Дата и время стрима (например, 25.02.2025 18:00):');
    let desc = prompt('Описание стрима:');
    schedule.push({ time, desc, votes: 0 });
    localStorage.setItem('schedule', JSON.stringify(schedule));
    updateSchedule();
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
});

function updateSchedule() {
    let list = document.getElementById('scheduleList');
    list.innerHTML = '';
    schedule.forEach((item, index) => {
        list.innerHTML += `<div class="item">${item.time} - ${item.desc} (Голосов: ${item.votes}) 
            <button onclick="voteSchedule(${index})">Голосовать</button></div>`;
    });
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
}

function voteSchedule(index) {
    if (user.role !== 'viewer') return alert('Только подписчики могут голосовать');
    schedule[index].votes++;
    localStorage.setItem('schedule', JSON.stringify(schedule));
    updateSchedule();
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
}

// Добавление фильма (только для стримера)
document.getElementById('addMovie').addEventListener('click', () => {
    if (user.role !== 'streamer') return alert('Только стримеры могут добавлять фильмы');
    let title = prompt('Название фильма:');
    let streamerRating = parseInt(prompt('Ваша оценка (1-10):'));
    let viewersRating = parseInt(prompt('Оценка зрителей (1-10):'));
    let totalRating = (streamerRating * 0.6) + (viewersRating * 0.4);
    movies.push({ title, streamerRating, viewersRating, totalRating });
    localStorage.setItem('movies', JSON.stringify(movies));
    updateMovies();
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
});

function updateMovies() {
    let list = document.getElementById('movieList');
    list.innerHTML = '';
    movies.forEach(movie => {
        list.innerHTML += `<div class="item">${movie.title} - Общая: ${movie.totalRating.toFixed(1)} 
            (Стример: ${movie.streamerRating}, Зрители: ${movie.viewersRating})</div>`;
    });
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена');
    if (window.location.hash) {
        handleTwitchAuth();
    } else {
        initializeApp();
    }
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны при загрузке
});
