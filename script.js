// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();

// Данные пользователя (хранятся в localStorage)
let user = JSON.parse(localStorage.getItem('user')) || { role: null, twitchId: null, followers: 0 };
let movies = JSON.parse(localStorage.getItem('movies')) || [];
let games = JSON.parse(localStorage.getItem('games')) || [];
let socials = JSON.parse(localStorage.getItem('socials')) || [];
let reviews = JSON.parse(localStorage.getItem('reviews')) || [];
let schedule = JSON.parse(localStorage.getItem('schedule')) || [];

// Глобальные переменные для секретов (Vercel автоматически подтянет их из Environment Variables)
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || '';
const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI || '';

// Проверка наличия секретов перед инициализацией
if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
    console.error('Ошибка: TWITCH_CLIENT_ID и TWITCH_REDIRECT_URI должны быть настроены в секретах Vercel.');
    alert('Ошибка: отсутствуют необходимые настройки. Вы можете зарегистрироваться как подписчик.');
    // Показываем форму регистрации даже без секретов, чтобы пользователь мог войти как подписчик
    showRegistrationWithoutAuth();
} else {
    initializeApp();
}

function initializeApp() {
    console.log('Инициализация приложения...');
    showRegistration();
}

function showRegistrationWithoutAuth() {
    const registrationForm = document.getElementById('registrationForm');
    const userProfile = document.getElementById('userProfile');
    registrationForm.classList.add('active');
    userProfile.classList.remove('active');
    document.getElementById('registerStreamerBtn').disabled = true; // Отключаем регистрацию стримера без секретов
    console.log('Показана форма регистрации без авторизации Twitch.');
    // Включаем кнопки вручную, если они скрыты
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.display = 'inline-block';
        btn.style.opacity = '1';
        btn.style.visibility = 'visible';
    });
}

// Показать форму регистрации, если пользователь не зарегистрирован
function showRegistration() {
    const registrationForm = document.getElementById('registrationForm');
    const userProfile = document.getElementById('userProfile');

    console.log('Проверка роли пользователя:', user);

    if (!user.role) {
        registrationForm.classList.add('active');
        userProfile.classList.remove('active');
        console.log('Пользователь не зарегистрирован, показана форма.');
        // Убедимся, что кнопки видны
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.display = 'inline-block';
            btn.style.opacity = '1';
            btn.style.visibility = 'visible';
        });
    } else {
        registrationForm.classList.remove('active');
        userProfile.classList.add('active');
        showProfile();
        console.log('Пользователь зарегистрирован, показан профиль.');
    }
}

// Показать текущий профиль
function showProfile() {
    const streamerSection = document.getElementById('streamerSection');
    const viewerSection = document.getElementById('viewerSection');
    const profileTitle = document.getElementById('profileTitle');
    const profileInfo = document.getElementById('profileInfo');

    console.log('Текущая роль пользователя:', user.role);

    if (user.role === 'streamer') {
        streamerSection.classList.add('active');
        viewerSection.classList.remove('active');
        profileTitle.textContent = 'Профиль стримера';
        profileInfo.textContent = `Привет, ${tg.initDataUnsafe.user.first_name || 'Стример'}! У вас ${user.followers} подписчиков.`;
        console.log('Показан профиль стримера.');
    } else {
        streamerSection.classList.remove('active');
        viewerSection.classList.add('active');
        profileTitle.textContent = 'Профиль подписчика';
        profileInfo.textContent = `Привет, ${tg.initDataUnsafe.user.first_name || 'Подписчик'}! Вы можете поддержать стримеров.`;
        console.log('Показан профиль подписчика.');
    }
    // Убедимся, что кнопки видны в профиле
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
        // Перенаправляем на Twitch для авторизации
        const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=token&scope=user:read:follows`;
        console.log('Twitch Auth URL:', TWITCH_AUTH_URL); // Для отладки
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
    console.log('Зарегистрирован как подписчик.');
});

// Обработка токена Twitch после авторизации
function handleTwitchAuth() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
        console.log('Получен access_token:', accessToken); // Для отладки
        // Запрос данных пользователя через Twitch API
        fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => {
            console.log('Twitch API Response:', response); // Для отладки
            return response.json();
        })
        .then(data => {
            if (data.data && data.data.length > 0) {
                const twitchUser = data.data[0];
                user.twitchId = twitchUser.login;
                user.role = 'streamer';

                // Получаем количество подписчиков
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
                        console.log('Зарегистрирован как стример с', user.followers, 'подписчиками.');
                    } else {
                        alert('У вас недостаточно подписчиков (нужно минимум 265).');
                        user.role = null;
                        user.twitchId = null;
                        user.followers = 0;
                        localStorage.setItem('user', JSON.stringify(user));
                        showRegistration();
                        console.log('Недостаточно подписчиков для регистрации стримера.');
                    }
                })
                .catch(error => {
                    alert('Ошибка при проверке подписчиков: ' + error.message);
                    console.error('Ошибка при проверке подписчиков:', error); // Для отладки
                    user.role = null;
                    user.twitchId = null;
                    user.followers = 0;
                    localStorage.setItem('user', JSON.stringify(user));
                    showRegistration();
                });
            } else {
                alert('Не удалось найти пользователя Twitch.');
                user.role = null;
                user.twitchId = null;
                user.followers = 0;
                localStorage.setItem('user', JSON.stringify(user));
                showRegistration();
                console.log('Не удалось найти пользователя Twitch.');
            }
        })
        .catch(error => {
            alert('Ошибка авторизации Twitch: ' + error.message);
            console.error('Ошибка авторизации Twitch:', error); // Для отладки
            user.role = null;
            user.twitchId = null;
            user.followers = 0;
            localStorage.setItem('user', JSON.stringify(user));
            showRegistration();
        });
    }
}

// Смена профиля
document.getElementById('switchProfileBtn').addEventListener('click', () => {
    user.role = null;
    user.twitchId = null;
    user.followers = 0;
    localStorage.setItem('user', JSON.stringify(user));
    showRegistration();
    console.log('Профиль сброшен, показана форма регистрации.');
});

// Выход из профиля
document.getElementById('logoutBtn').addEventListener('click', () => {
    user.role = null;
    user.twitchId = null;
    user.followers = 0;
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('movies');
    localStorage.removeItem('games');
    localStorage.removeItem('socials');
    localStorage.removeItem('reviews');
    localStorage.removeItem('schedule');
    movies = [];
    games = [];
    socials = [];
    reviews = [];
    schedule = [];
    showRegistration();
    console.log('Пользователь вышел, все данные сброшены.');
});

// Добавление расписания (только для стримера)
document.getElementById('addSchedule').addEventListener('click', () => {
    if (user.role !== 'streamer') return alert('Только стримеры могут добавлять расписание.');
    let time = prompt('Введите дату и время стрима (например, 25.02.2025 18:00):');
    let desc = prompt('Описание стрима:');
    schedule.push({ time, desc, votes: 0 });
    localStorage.setItem('schedule', JSON.stringify(schedule));
    updateSchedule();
    console.log('Добавлено новое расписание:', { time, desc });
});

// Обновление расписания
function updateSchedule() {
    let list = document.getElementById('scheduleList');
    list.innerHTML = '';
    schedule.forEach((item, index) => {
        list.innerHTML += `<div class="item">${item.time} - ${item.desc} (Голосов: ${item.votes}) 
            <button onclick="voteSchedule(${index})">Голосовать</button></div>`;
    });
    console.log('Обновлено расписание:', schedule);
}

// Голосование за расписание (только для подписчика)
function voteSchedule(index) {
    if (user.role !== 'viewer') return alert('Только подписчики могут голосовать.');
    schedule[index].votes++;
    localStorage.setItem('schedule', JSON.stringify(schedule));
    updateSchedule();
    console.log('Голос добавлен для стрима:', schedule[index]);
}

// Добавление фильма (пример для стримера)
document.getElementById('addMovie').addEventListener('click', () => {
    if (user.role !== 'streamer') return alert('Только стримеры могут добавлять фильмы.');
    let title = prompt('Название фильма:');
    let streamerRating = parseInt(prompt('Ваша оценка (1-10):'));
    let viewersRating = parseInt(prompt('Оценка зрителей (1-10):'));
    let totalRating = (streamerRating * 0.6) + (viewersRating * 0.4);
    movies.push({ title, streamerRating, viewersRating, totalRating });
    localStorage.setItem('movies', JSON.stringify(movies));
    updateMovies();
    console.log('Добавлен фильм:', { title, totalRating });
});

function updateMovies() {
    let list = document.getElementById('movieList');
    list.innerHTML = '';
    movies.forEach(movie => {
        list.innerHTML += `<div class="item">${movie.title} - Общая: ${movie.totalRating.toFixed(1)} 
            (Стример: ${movie.streamerRating}, Зрители: ${movie.viewersRating})</div>`;
    });
    console.log('Обновлен список фильмов:', movies);
}

// Аналогично для игр, соцсетей, отзывов (добавь в код аналогичные функции, как в предыдущем варианте)

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализация...');
    initializeApp();
    // Проверка, вернулся ли пользователь с Twitch
    if (window.location.hash) {
        console.log('Обработка возврата с Twitch...');
        handleTwitchAuth();
    }
});

// Заглушки для других функций (Twitch трекер, топ стримеров)
document.getElementById('twitchTracker').innerHTML = 'Twitch трекер в разработке...';
document.getElementById('topStreamers').innerHTML = 'Топ стримеров обновляется...';
