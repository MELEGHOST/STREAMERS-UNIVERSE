// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
if (tg) {
    tg.ready();
    console.log('Telegram Web App инициализирован:', tg.initDataUnsafe);
} else {
    console.error('Telegram Web App не инициализирован');
}

// Данные пользователя
let user = JSON.parse(localStorage.getItem('user')) || { role: null, twitchId: null, followers: 0, name: null };
let movies = JSON.parse(localStorage.getItem('movies')) || [];
let games = JSON.parse(localStorage.getItem('games')) || [];
let socials = JSON.parse(localStorage.getItem('socials')) || [];
let reviews = JSON.parse(localStorage.getItem('reviews')) || [];
let schedule = JSON.parse(localStorage.getItem('schedule')) || [];

// Использование секретов из Vercel с запасным планом для теста
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || 'YOUR_TWITCH_CLIENT_ID'; // Временная заглушка для теста
const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI || 'https://streamers-universe-mini-app.vercel.app'; // Временная заглушка для теста

// Проверка наличия секретов перед инициализацией
if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
    console.error('Ошибка: отсутствуют TWITCH_CLIENT_ID или TWITCH_REDIRECT_URI в Vercel secrets. Используются временные заглушки.');
    alert('Внимание: настройки Twitch не найдены в Vercel. Используются временные значения для теста. Регистрация может не работать.');
    // Если секреты отсутствуют, можно временно использовать заглушки для теста, но это небезопасно
} 
initializeApp(); // Полная инициализация

function showFallbackUI() {
    console.log('Показ базового интерфейса без Twitch...');
    showFrame('roleSelectionFrame');
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
}

function initializeApp() {
    console.log('Инициализация приложения...');
    if (!user.role) {
        showFrame('roleSelectionFrame'); // Показываем экран выбора роли
        showMenu(false); // Скрываем меню
    } else {
        showMenu(true); // Показываем меню
        showProfile(); // Показываем профиль
    }
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
    setupEventListeners(); // Устанавливаем обработчики событий
}

function showFrame(frameId) {
    const frames = document.querySelectorAll('.frame');
    frames.forEach(frame => {
        frame.classList.remove('active', 'hidden');
    });
    const activeFrame = document.getElementById(frameId);
    if (activeFrame) {
        activeFrame.classList.add('active');
        frames.forEach(frame => frame.classList.add('hidden')); // Скрываем все, кроме активного
        activeFrame.classList.remove('hidden'); // Показываем активный
        console.log(`Показан фрейм: ${frameId}`);
    } else {
        console.error(`Экран с id "${frameId}" не найден`);
    }
}

function showMenu(show) {
    const menu = document.getElementById('mainMenu');
    if (menu) {
        if (show) {
            menu.classList.add('active');
            menu.classList.remove('hidden');
        } else {
            menu.classList.remove('active');
            menu.classList.add('hidden');
        }
        console.log(`Меню ${show ? 'показано' : 'скрыто'}`);
    } else {
        console.error('Элемент меню с id "mainMenu" не найден');
    }
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

function setupEventListeners() {
    // Проверка существования элементов перед добавлением обработчиков
    const streamerBtn = document.getElementById('streamerBtn');
    const subscriberBtn = document.getElementById('subscriberBtn');
    const authorizeBtn = document.getElementById('authorizeBtn');
    const goToProfileBtn = document.getElementById('goToProfile');
    const goToTwitchBtn = document.getElementById('goToTwitch');
    const goToTopBtn = document.getElementById('goToTop');
    const switchProfileBtn = document.getElementById('switchProfileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const addScheduleBtn = document.getElementById('addSchedule');
    const addMovieBtn = document.getElementById('addMovie');

    if (streamerBtn) {
        streamerBtn.addEventListener('click', () => {
            selectedRole = 'streamer';
            showFrame('authFrame');
            ensureButtonsVisible();
            console.log('Выбрана роль: стример');
        });
    } else {
        console.error('Кнопка "streamerBtn" не найдена');
    }

    if (subscriberBtn) {
        subscriberBtn.addEventListener('click', () => {
            selectedRole = 'subscriber';
            showFrame('authFrame');
            ensureButtonsVisible();
            console.log('Выбрана роль: подписчик');
        });
    } else {
        console.error('Кнопка "subscriberBtn" не найдена');
    }

    if (authorizeBtn) {
        authorizeBtn.addEventListener('click', () => {
            const twitchLogin = document.getElementById('twitchLogin')?.value.trim() || '';
            if (!twitchLogin) {
                showError('Введите ваш Twitch никнейм');
                return;
            }
            const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=token&scope=user:read:follows&state=${twitchLogin}|${selectedRole}`;
            console.log('Перенаправление на Twitch:', TWITCH_AUTH_URL);
            window.location.href = TWITCH_AUTH_URL;
            ensureButtonsVisible(); // Убеждаемся, что кнопки видны
        });
    } else {
        console.error('Кнопка "authorizeBtn" не найдена');
    }

    if (goToProfileBtn) {
        goToProfileBtn.addEventListener('click', () => showProfile());
    } else {
        console.error('Кнопка "goToProfile" не найдена');
    }

    if (goToTwitchBtn) {
        goToTwitchBtn.addEventListener('click', () => showFrame('twitchFrame'));
    } else {
        console.error('Кнопка "goToTwitch" не найдена');
    }

    if (goToTopBtn) {
        goToTopBtn.addEventListener('click', () => showFrame('topFrame'));
    } else {
        console.error('Кнопка "goToTop" не найдена');
    }

    if (switchProfileBtn) {
        switchProfileBtn.addEventListener('click', () => {
            user = { role: null, twitchId: null, followers: 0, name: null };
            localStorage.setItem('user', JSON.stringify(user));
            showFrame('roleSelectionFrame');
            showMenu(false);
            ensureButtonsVisible();
            console.log('Смена профиля, возвращён на выбор роли');
        });
    } else {
        console.error('Кнопка "switchProfileBtn" не найдена');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            user = { role: null, twitchId: null, followers: 0, name: null };
            localStorage.clear();
            movies = []; games = []; socials = []; reviews = []; schedule = [];
            showFrame('roleSelectionFrame');
            showMenu(false);
            ensureButtonsVisible();
            console.log('Выход выполнен, возвращён на выбор роли');
        });
    } else {
        console.error('Кнопка "logoutBtn" не найдена');
    }

    if (addScheduleBtn) {
        addScheduleBtn.addEventListener('click', () => {
            if (user.role !== 'streamer') return alert('Только стримеры могут добавлять расписание');
            let time = prompt('Дата и время стрима (например, 25.02.2025 18:00):');
            let desc = prompt('Описание стрима:');
            schedule.push({ time, desc, votes: 0 });
            localStorage.setItem('schedule', JSON.stringify(schedule));
            updateSchedule();
            ensureButtonsVisible();
        });
    } else {
        console.error('Кнопка "addSchedule" не найдена');
    }

    if (addMovieBtn) {
        addMovieBtn.addEventListener('click', () => {
            if (user.role !== 'streamer') return alert('Только стримеры могут добавлять фильмы');
            let title = prompt('Название фильма:');
            let streamerRating = parseInt(prompt('Ваша оценка (1-10):'));
            let viewersRating = parseInt(prompt('Оценка зрителей (1-10):'));
            let totalRating = (streamerRating * 0.6) + (viewersRating * 0.4);
            movies.push({ title, streamerRating, viewersRating, totalRating });
            localStorage.setItem('movies', JSON.stringify(movies));
            updateMovies();
            ensureButtonsVisible();
        });
    } else {
        console.error('Кнопка "addMovie" не найдена');
    }
}

let selectedRole = null;

function showProfile() {
    showFrame('profileFrame');
    const streamerSection = document.getElementById('streamerSection');
    const viewerSection = document.getElementById('viewerSection');
    const profileTitle = document.getElementById('profileTitle');
    const profileInfo = document.getElementById('profileInfo');

    if (streamerSection && viewerSection && profileTitle && profileInfo) {
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
    } else {
        console.error('Один или несколько элементов профиля не найдены');
    }
}

function showError(message) {
    const error = document.getElementById('authError');
    if (error) {
        error.textContent = message;
        error.classList.add('active');
        setTimeout(() => error.classList.remove('active'), 3000); // Скрываем через 3 секунды
        console.log('Показана ошибка:', message);
    } else {
        console.error('Элемент "authError" не найден');
    }
}

function handleTwitchAuth() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const state = params.get('state'); // Получаем состояние (никнейм и роль)

    if (accessToken && state) {
        const [twitchLogin, role] = state.split('|'); // Разделяем никнейм и роль
        console.log('Получен токен и состояние:', { accessToken, twitchLogin, role });

        fetch('https://api.twitch.tv/helix/users', {
            headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.data && data.data.length > 0) {
                const twitchUser = data.data[0];
                user.twitchId = twitchUser.login;
                user.name = twitchUser.display_name || twitchUser.login; // Сохраняем имя пользователя

                fetch(`https://api.twitch.tv/helix/users/follows?to_id=${twitchUser.id}`, {
                    headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
                })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(followsData => {
                    user.followers = followsData.total || 0;
                    // Устанавливаем роль на основе выбора пользователя или фолловеров
                    if (role === 'subscriber' || (role === 'streamer' && user.followers < 265)) {
                        user.role = 'subscriber'; // Стример может войти как подписчик
                        showError('У вас меньше 265 подписчиков. Вы зарегистрированы как подписчик.');
                    } else if (role === 'streamer' && user.followers >= 265) {
                        user.role = 'streamer'; // Стример с достаточным количеством фолловеров
                    } else {
                        user.role = 'subscriber'; // По умолчанию подписчик, если выбор некорректен
                    }
                    localStorage.setItem('user', JSON.stringify(user));
                    showMenu(true); // Показываем меню после авторизации
                    showProfile(); // Показываем профиль
                    console.log(`${user.role === 'streamer' ? 'Стример' : 'Подписчик'} зарегистрирован:`, user.name, user.followers, 'подписчиков');
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

function updateSchedule() {
    let list = document.getElementById('scheduleList');
    if (list) {
        list.innerHTML = '';
        schedule.forEach((item, index) => {
            list.innerHTML += `<div class="item">${item.time} - ${item.desc} (Голосов: ${item.votes}) 
                <button onclick="voteSchedule(${index})">Голосовать</button></div>`;
        });
        ensureButtonsVisible(); // Убеждаемся, что кнопки видны
    } else {
        console.error('Элемент "scheduleList" не найден');
    }
}

function voteSchedule(index) {
    if (user.role !== 'subscriber') return alert('Только подписчики могут голосовать');
    schedule[index].votes++;
    localStorage.setItem('schedule', JSON.stringify(schedule));
    updateSchedule();
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны
}

function updateMovies() {
    let list = document.getElementById('movieList');
    if (list) {
        list.innerHTML = '';
        movies.forEach(movie => {
            list.innerHTML += `<div class="item">${movie.title} - Общая: ${movie.totalRating.toFixed(1)} 
                (Стример: ${movie.streamerRating}, Зрители: ${movie.viewersRating})</div>`;
        });
        ensureButtonsVisible(); // Убеждаемся, что кнопки видны
    } else {
        console.error('Элемент "movieList" не найден');
    }
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
    setupEventListeners(); // Устанавливаем обработчики событий
});
