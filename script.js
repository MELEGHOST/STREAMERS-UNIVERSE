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

// Переменные для Twitch API
let TWITCH_CLIENT_ID = '';
let TWITCH_REDIRECT_URI = '';
let selectedRole = null;

// Загрузка конфигурации с сервера
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        
        TWITCH_CLIENT_ID = config.TWITCH_CLIENT_ID || '';
        TWITCH_REDIRECT_URI = config.TWITCH_REDIRECT_URI || '';
        
        if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
            console.error('Конфигурация Twitch API отсутствует');
            alert('Внимание: настройки Twitch не найдены. Авторизация через Twitch невозможна. Обратитесь к администратору.');
            showFallbackUI();
            return false;
        } else {
            console.log('Конфигурация Twitch API загружена успешно');
            return true;
        }
    } catch (error) {
        console.error('Ошибка загрузки конфигурации:', error);
        alert('Ошибка: не удалось загрузить настройки Twitch. Обратитесь к администратору.');
        showFallbackUI();
        return false;
    }
}

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
    addRandomStars(); // Добавляем случайные звёзды
}

function showFrame(frameId) {
    const frames = document.querySelectorAll('.frame');
    frames.forEach(frame => {
        frame.classList.remove('active');
        frame.classList.add('hidden');
    });
    const activeFrame = document.getElementById(frameId);
    if (activeFrame) {
        activeFrame.classList.add('active');
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
        authorizeBtn.addEventListener('click', async () => {
            // Убедимся, что конфигурация загружена
            if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
                const configLoaded = await loadConfig();
                if (!configLoaded) {
                    showError('Настройки Twitch отсутствуют. Обратитесь к администратору.');
                    return;
                }
            }
            
            const twitchLogin = document.getElementById('twitchLogin')?.value.trim() || '';
            if (!twitchLogin) {
                showError('Введите ваш Twitch никнейм');
                return;
            }
            const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=token&scope=user:read:follows&state=${twitchLogin}|${selectedRole}`;
            console.log('Перенаправление на Twitch. Client ID:', TWITCH_CLIENT_ID, 'Redirect URI:', TWITCH_REDIRECT_URI);
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

function showProfile() {
    showFrame('profileFrame');
    const streamerSection = document.getElementById('streamerSection');
    const viewerSection = document.getElementById('viewerSection');
    const profileTitle = document.getElementById('profileTitle');
    const profileInfo = document.getElementById('profileInfo');

    if (streamerSection && viewerSection && profileTitle && profileInfo) {
        if (user.role === 'streamer') {
            streamerSection.classList.remove('hidden');
            streamerSection.classList.add('active');
            viewerSection.classList.add('hidden');
            viewerSection.classList.remove('active');
            profileTitle.textContent = `Профиль стримера: ${user.name}`;
            profileInfo.textContent = `У вас ${user.followers} подписчиков.`;
            console.log('Показан профиль стримера');
        } else {
            streamerSection.classList.add('hidden');
            streamerSection.classList.remove('active');
            viewerSection.classList.remove('hidden');
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
        error.classList.remove('hidden');
        error.classList.add('active');
        setTimeout(() => {
            error.classList.remove('active');
            error.classList.add('hidden');
        }, 3000); // Скрываем через 3 секунды
        console.log('Показана ошибка:', message);
    } else {
        console.error('Элемент "authError" не найден');
        alert(message); // Запасной вариант, если элемент ошибки не найден
    }
}

async function handleTwitchAuth() {
    // Проверяем, загружена ли конфигурация
    if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
        const configLoaded = await loadConfig();
        if (!configLoaded) {
            console.error('Не удалось загрузить конфигурацию для обработки авторизации');
            showError('Не удалось загрузить настройки Twitch');
            return;
        }
    }

    const hash = window.location.hash.substring(1);
    if (!hash) {
        console.log('Нет данных авторизации в URL');
        return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const state = params.get('state'); // Получаем состояние (никнейм и роль)

    if (!accessToken || !state) {
        console.error('Отсутствует токен доступа или состояние в URL');
        showError('Ошибка авторизации: отсутствуют необходимые данные');
        return;
    }

    console.log('Получен токен и состояние:', { accessToken, state });

    try {
        const [twitchLogin, role] = state.split('|'); // Разделяем никнейм и роль
        if (!twitchLogin || !role) {
            throw new Error('Неверный формат состояния');
        }

        // Запрос информации о пользователе
        const userResponse = await fetch('https://api.twitch.tv/helix/users', {
            headers: { 
                'Client-ID': TWITCH_CLIENT_ID, 
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userResponse.ok) {
            throw new Error(`HTTP error! status: ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        if (!userData.data || userData.data.length === 0) {
            throw new Error('Пользователь Twitch не найден');
        }

        const twitchUser = userData.data[0];
        user.twitchId = twitchUser.login;
        user.name = twitchUser.display_name || twitchUser.login;

        // Запрос информации о подписчиках
        const followsResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${twitchUser.id}`, {
            headers: { 
                'Client-ID': TWITCH_CLIENT_ID, 
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!followsResponse.ok) {
            throw new Error(`HTTP error! status: ${followsResponse.status}`);
        }

        const followsData = await followsResponse.json();
        user.followers = followsData.total || 0;

        // Устанавливаем роль
        if (role === 'subscriber' || (role === 'streamer' && user.followers < 265)) {
            user.role = 'subscriber';
            if (role === 'streamer' && user.followers < 265) {
                showError('У вас меньше 265 подписчиков. Вы зарегистрированы как подписчик.');
            }
        } else if (role === 'streamer' && user.followers >= 265) {
            user.role = 'streamer';
        } else {
            user.role = 'subscriber';
        }

        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify(user));
        
        // Обновляем интерфейс
        showMenu(true);
        showProfile();
        
        console.log(`${user.role === 'streamer' ? 'Стример' : 'Подписчик'} зарегистрирован:`, user.name, user.followers, 'подписчиков');
        
        // Очищаем хэш из URL для предотвращения повторной авторизации при обновлении
        history.replaceState(null, null, ' ');
    } catch (error) {
        console.error('Ошибка обработки авторизации:', error);
        showError(`Ошибка авторизации: ${error.message}`);
        showFrame('roleSelectionFrame');
    }

    ensureButtonsVisible();
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

// Создание случайных звёзд
function addRandomStars() {
    const body = document.body;
    for (let i = 0; i < 50; i++) { // Увеличиваем количество звёзд для большего разнообразия
        const star = document.createElement('div');
        star.className = 'star';
        star.style.width = `${Math.random() * 3 + 1}px`; // Размер от 1 до 4px
        star.style.height = star.style.width;
        star.style.top = `${Math.random() * 100}%`; // Случайное положение по высоте
        star.style.left = `${Math.random() * 100}%`; // Случайное положение по ширине
        star.style.animationDelay = `${Math.random() * 5}s`; // Случайная задержка анимации
        body.appendChild(star);
    }
    console.log('Случайные звёзды добавлены');
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Страница загружена');
    
    // Сначала всегда загружаем конфигурацию
    const configLoaded = await loadConfig();
    
    if (window.location.hash && configLoaded) {
        // Если есть хэш в URL, значит произошло перенаправление после авторизации
        await handleTwitchAuth();
    } else {
        // Инициализируем приложение
        initializeApp();
    }
    
    ensureButtonsVisible(); // Убеждаемся, что кнопки видны при загрузке
});

// Делаем функцию voteSchedule глобальной, чтобы она была доступна из HTML
window.voteSchedule = voteSchedule;
