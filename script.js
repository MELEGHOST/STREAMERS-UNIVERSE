const tg = window.Telegram.WebApp;
tg.ready();
let streamers = [];
let currentUser = { id: tg.initDataUnsafe.user.id, followers: 0, isStreamer: false };
let movies = [];
let games = [];
let socials = [];
let reviews = [];
let schedule = [];
let ratings = {};

document.getElementById('registerStreamer').addEventListener('click', () => {
    let followers = prompt('Сколько у вас подписчиков?');
    followers = parseInt(followers);
    if (followers >= 265) {
        currentUser.isStreamer = true;
        currentUser.followers = followers;
        streamers.push(currentUser);
        alert('Вы зарегистрированы как стример!');
    } else {
        alert('Нужно минимум 265 подписчиков для регистрации.');
    }
});

document.getElementById('addSchedule').addEventListener('click', () => {
    if (!currentUser.isStreamer) return alert('Только стримеры могут добавлять расписание.');
    let time = prompt('Введите дату и время стрима (например, 25.02.2025 18:00):');
    let desc = prompt('Описание стрима:');
    schedule.push({ time, desc, votes: 0 });
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
    schedule[index].votes++;
    updateSchedule();
}

document.getElementById('addMovie').addEventListener('click', () => {
    if (!currentUser.isStreamer) return alert('Только стримеры могут добавлять фильмы.');
    let title = prompt('Название фильма:');
    let streamerRating = parseInt(prompt('Ваша оценка (1-10):'));
    let viewersRating = parseInt(prompt('Оценка зрителей (1-10):'));
    let totalRating = (streamerRating * 0.6) + (viewersRating * 0.4);
    movies.push({ title, streamerRating, viewersRating, totalRating });
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

document.getElementById('addGame').addEventListener('click', () => {
    if (!currentUser.isStreamer) return alert('Только стримеры могут добавлять игры.');
    let game = prompt('Название игры:');
    games.push(game);
    updateGames();
});

function updateGames() {
    let list = document.getElementById('gameList');
    list.innerHTML = '';
    games.forEach(game => {
        list.innerHTML += `<div class="item">${game}</div>`;
    });
}

document.getElementById('addSocial').addEventListener('click', () => {
    if (!currentUser.isStreamer) return alert('Только стримеры могут добавлять соцсети.');
    let link = prompt('Ссылка на соцсеть:');
    socials.push(link);
    updateSocials();
});

function updateSocials() {
    let list = document.getElementById('socialLinks');
    list.innerHTML = '';
    socials.forEach(link => {
        list.innerHTML += `<div class="item"><a href="${link}" target="_blank">${link}</a></div>`;
    });
}

document.getElementById('addReview').addEventListener('click', () => {
    if (!currentUser.isStreamer) return alert('Только стримеры могут добавлять отзывы.');
    let category = prompt('Категория (фильмы, игры, еда и т.д.):');
    let item = prompt('Название предмета:');
    let rating = parseInt(prompt('Ваша оценка (1-10):'));
    reviews.push({ category, item, rating });
    updateReviews();
    updateTierList(category);
});

function updateReviews() {
    let list = document.getElementById('reviewList');
    list.innerHTML = '';
    reviews.forEach(review => {
        list.innerHTML += `<div class="item">${review.category}: ${review.item} - ${review.rating}</div>`;
    });
}

function updateTierList(category) {
    let categoryReviews = reviews.filter(r => r.category === category);
    if (categoryReviews.length >= 10) {
        categoryReviews.sort((a, b) => b.rating - a.rating);
        let tierList = `Тир-лист ${category}:\n`;
        categoryReviews.forEach((r, i) => {
            tierList += `${i + 1}. ${r.item} - ${r.rating}\n`;
        });
        alert(tierList);
    }
}

document.getElementById('donate').addEventListener('click', () => {
    alert('Донат через Telegram Stars (в разработке). Безопасный перевод на карту пока не реализован.');
});

document.getElementById('askQuestion').addEventListener('click', () => {
    let questionPrice = currentUser.isStreamer ? parseInt(prompt('Установите цену вопроса в валюте (0 для бесплатного):')) : 5;
    if (!currentUser.isStreamer) {
        let currency = parseInt(prompt('У вас 10 монет. Вопрос стоит 5. Оплатить? (введите 5 для оплаты)'));
        if (currency === 5) {
            let question = prompt('Ваш вопрос:');
            alert(`Вопрос "${question}" отправлен стримеру!`);
        } else {
            alert('Недостаточно монет. Смотрите рекламу для получения.');
        }
    }
});

document.getElementById('requestCollab').addEventListener('click', () => {
    let collab = prompt('С кем хотите коллаб?');
    alert(`Запрос на коллаб с ${collab} отправлен!`);
});

function updateTopStreamers() {
    let list = document.getElementById('topStreamers');
    list.innerHTML = 'Топ стримеров обновляется...';
}

document.getElementById('twitchTracker').innerHTML = 'Twitch трекер в разработке...';
