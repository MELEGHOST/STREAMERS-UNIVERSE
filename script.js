// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
console.log('Telegram Web App инициализирован:', tg.initDataUnsafe);

// Данные пользователя
let user = JSON.parse(localStorage.getItem('user')) || { role: null, twitchId: null, followers: 0 };
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
    alert('Ошибка: настройки Twitch не найдены. Регистрация как стример недоступна.');
    showFallbackUI(); // Показываем базовый интерфейс
} else {
    initializeApp(); // Полная инициализация
}

function showFallbackUI() {
    console.log('Показ базового интерфейса без Twitch...');
    const registrationForm = document.getElementById('registrationForm');
    const userProfile = document.getElementById('userProfile');
    registrationForm.classList.add('active');
    userProfile.classList.remove('active');
    document.getElementById('registerStreamerBtn').style.display = 'none'; // Скрываем кнопку стримера
    document.getElementById('registerViewerBtn').style.display = 'inline-block'; // Показываем кнопку подписчика
}

function initializeApp() {
    console.log('Инициализация приложения...');
    showRegistration();
}

function showRegistration() {
    const registrationForm = document.getElementById('registrationForm');
    const userProfile = document.getElementById('userProfile');
    console.log('Текущий пользователь:', user);

    if (!user.role) {
        registrationForm.classList.add('active');
        userProfile.classList.remove('active');
        console.log('Показана форма регистрации');
    } else {
        registrationForm.classList.remove('active');
        userProfile.classList.add('active');
        showProfile();
        console.log('Показан профиль пользователя');
    }

    // Убеждаемся, что кнопки видны
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.display = 'inline-block';
        btn.style.opacity = '1';
        btn.style.visibility = 'visible';
    });
}

function showProfile() {
    const streamerSection = document.getElementById('streamerSection');
    const viewerSection = document.getElementById('viewerSection');
    const profileTitle = document.getElementById('profileTitle');
    const profileInfo = document.getElementById('profileInfo');

    console.log('Роль пользователя:', user.role);

    if (user.role === 'streamer') {
        streamerSection.classList.add('active');
        viewerSection.classList.remove('active');
        profileTitle.textContent = 'Профиль стримера';
        profileInfo.textContent = `Привет, ${tg.initDataUnsafe.user?.first_name || 'Стример'}! У вас ${user.followers} подписчиков.`;
        console.log('Показан профиль стримера');
    } else {
        streamerSection.classList.remove('active');
        viewerSection.classList.add('active');
        profileTitle.textContent = 'Профиль подписчика';
        profileInfo.textContent = `Привет, ${tg.initDataUnsafe.user?.first_name || 'Подписчик'}! Вы можете поддержать стримеров.`;
        console.log('Показан профиль подписчика');
    }

    // Убеждаемся, что кнопки видны
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.display = 'inline-block';
        btn.style.opacity = '1';
        btn.style.visibility = 'visible';
    });
}

// Регистрация стримера
document.getElementById('registerStreamerBtn').addEventListener('click', () => {
    const twitchLogin = prompt('Введите ваш Twitch логин (без @):');
    if (twitchLogin) {
        const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=token&scope=user:read:follows`;
        console.log('Перенаправление на Twitch:', TWITCH_AUTH_URL);
        window.location.href = TWITCH_AUTH_URL;
    }
});

// Регистрация подписчика
document.getElementById('registerViewerBtn').addEventListener('click', () => {
    user.role = 'viewer';
    user.twitchId = null;
    user.followers = 0;
    localStorage.setItem('user', JSON.stringify(user));
    showProfile();
    showRegistration();
    console.log('Зарегистрирован как подписчик');
});

// Обработка токена Twitch
function handleTwitchAuth() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
        console.log('Получен токен:', accessToken);
        fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.data && data.data.length > 0) {
                const twitchUser = data.data[0];
                user.twitchId = twitchUser.login;
                user.role = 'streamer';

                fetch(`https://api.twitch.tv/helix/users/follows?to_id=${twitchUser.id}`, {
                    headers: {
                        'Client-ID': TWITCH_CLIENT_ID,
                        'Authorization': `Bearer ${accessToken}`
                    }
                })
                .then(response => response.json())
                .then(followsData => {
                    user.followers = followsData.total || 0;
                    if (user.followers >= 265) {
                        localStorage.setItem('user', JSON.stringify(user));
                        showProfile();
                        showRegistration();
                        console.log('Стример зарегистрирован:', user.followers, 'подписчиков');
                    } else {
                        alert('У вас меньше 265 подписчиков');
                        user.role = null;
                        user.twitchId = null;
                        user.followers = 0;
                        localStorage.setItem('user', JSON.stringify(user));
                        showRegistration();
                    }
                })
                .catch(error => console.error('Ошибка проверки подписчиков:', error));
            } else {
                alert('Пользователь Twitch не найден');
                user.role = null;
                user.twitchId = null;
                user.followers = 0;
                localStorage.setItem('user', JSON.stringify(user));
                showRegistration();
            }
        })
        .catch(error => console.error('Ошибка авторизации Twitch:', error));
    }
}

// Смена профиля
document.getElementById('switchProfileBtn').addEventListener('click', () => {
    user.role = null;
    user.twitchId = null;
    user.followers = 0;
    localStorage.setItem('user', JSON.stringify(user));
    showRegistration();
    console.log('Смена профиля');
});

// Выход
document.getElementById('logoutBtn').addEventListener('click', () => {
    user.role = null;
    user.twitchId = null;
    user.followers = 0;
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.clear(); // Полная очистка
    movies = []; games = []; socials = []; reviews = []; schedule = [];
    showRegistration();
    console.log('Выход выполнен');
});

// Добавление расписания
document.getElementById('addSchedule').addEventListener('click', () => {
    if (user.role !== 'streamer') return alert('Только стримеры могут добавлять расписание');
    let time = prompt('Дата и время стрима (например, 25.02.2025 18:00):');
    let desc = prompt('Описание стрима:');
    schedule.push({ time, desc, votes: 0 });
    localStorage.setItem('schedule', JSON.stringify(schedule));
    updateSchedule();
});

function updateSchedule() {
    let list = document.getElementById('scheduleList');
    list.innerHTML = '';
    schedule.forEach((item, index) => {
        list.innerHTML += `<div class="item">${item.time} - ${item.desc} (Голосов: ${item.votes}) 
            <button onclick="voteSchedule(${index})">Голосовать</button></div>`;
    });
}

function voteSchedule(index) {
    if (user.role !== 'viewer') return alert('Только подписчики могут голосовать');
    schedule[index].votes++;
    localStorage.setItem('schedule', JSON.stringify(schedule));
    updateSchedule();
}

// Добавление фильма
document.getElementById('addMovie').addEventListener('click', () => {
    if (user.role !== 'streamer') return alert('Только стримеры могут добавлять фильмы');
    let title = prompt('Название фильма:');
    let streamerRating = parseInt(prompt('Ваша оценка (1-10):'));
    let viewersRating = parseInt(prompt('Оценка зрителей (1-10):'));
    let totalRating = (streamerRating * 0.6) + (viewersRating * 0.4);
    movies.push({ title, streamerRating, viewersRating, totalRating });
    localStorage.setItem('movies', JSON.stringify(movies));
    updateMovies();
});

function updateMovies() {
    let list = document.getElementById('movieList');
    list.innerHTML = '';
    movies.forEach(movie => {
        list.innerHTML += `<div class="item">${movie.title} - Общая: ${movie.totalRating.toFixed(1)} 
            (Стример: ${movie.streamerRating}, Зрители: ${movie.viewersRating})</div>`;
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена');
    if (window.location.hash) {
        handleTwitchAuth();
    } else {
        initializeApp();
    }
});
