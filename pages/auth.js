const React = require('react');
const { signIn } = require('next-auth/react');
const { useRouter } = require('next/router');
const styled = require('styled-components').default;

const Container = styled.div`
  background: linear-gradient(to bottom, #0a0a2a, #1a1a4a); /* Тёмный космический градиент */
  min-height: 100vh;
  height: 100vh; /* Фиксированная высота для предотвращения прокрутки */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Arial', sans-serif;
  overflow: hidden; /* Убираем прокрутку на мобильных устройствах */
  position: relative;
  -webkit-overflow-scrolling: touch; /* Отключаем нативную прокрутку iOS */
`;

const Logo = styled.img`
  max-width: 250px;
  margin-bottom: 40px; /* Лого выше кнопки */
  animation: pulse 2s infinite ease-in-out; /* Мягкое пульсирующее свечение */

  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
    50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 20px rgba(255, 255, 255, 0.6); }
    100% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
  }
`;

const GalaxyButton = styled.div`
  .space-button {
    --cut: 0.1em;
    --active: 0;
    --bg: radial-gradient(
          120% 120% at 126% 126%,
          hsl(0 calc(var(--active) * 97%) 98% / calc(var(--active) * 0.9)) 40%,
          /* Changed hue to 0 for red */ transparent 50%
        )
        calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      radial-gradient(
          120% 120% at 120% 120%,
          hsl(0 calc(var(--active) * 97%) 70% / calc(var(--active) * 1)) 30%,
          /* Changed hue to 0 for red */ transparent 70%
        )
        calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      hsl(0 calc(var(--active) * 100%) calc(12% - (var(--active) * 8%))); /* Changed hue to 0 for red */
    background: var(--bg);
    font-size: 1.4rem;
    font-weight: 500;
    border: 0;
    cursor: pointer;
    padding: 0.9em 1.3em;
    display: flex;
    align-items: center;
    gap: 0.25em;
    white-space: nowrap;
    border-radius: 2rem;
    position: relative;
    box-shadow:
      0 0 calc(var(--active) * 6em) calc(var(--active) * 3em)
        hsla(12, 97%, 61%, 0.3),
      0 0.05em 0 0
        hsl(0, calc(var(--active) * 97%), calc((var(--active) * 50%) + 30%)) inset,
      0 -0.05em 0 0 hsl(0, calc(var(--active) * 97%), calc(var(--active) * 10%)) inset;
    transition:
      box-shadow 0.25s ease-out,
      scale 0.25s,
      background 0.25s;
    scale: calc(1 + (var(--active) * 0.1));
    transform-style: preserve-3d;
    perspective: 100vmin;
    overflow: hidden;
    user-select: none; /* Запрещаем выделение кнопки */
    -webkit-user-select: none; /* Для Safari */
    -moz-user-select: none; /* Для Firefox */
    -ms-user-select: none; /* Для Edge */
  }

  .space-button:active {
    scale: 1;
    --bg: radial-gradient(
          120% 120% at 126% 126%,
          hsl(245 calc(var(--active) * 97%) 98% / calc(var(--active) * 0.9)) 40%,
          transparent 50%
        )
        calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      radial-gradient(
          120% 120% at 120% 120%,
          hsl(245 calc(var(--active) * 97%) 70% / calc(var(--active) * 1)) 30%,
          transparent 70%
        )
        calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      hsl(245 calc(var(--active) * 100%) calc(12% - (var(--active) * 8%)));
    box-shadow:
      0 0 calc(var(--active) * 6em) calc(var(--active) * 3em)
        hsl(245 97% 61% / 0.5),
      0 0.05em 0 0
        hsl(245 calc(var(--active) * 97%) calc((var(--active) * 50%) + 30%)) inset,
      0 -0.05em 0 0 hsl(245 calc(var(--active) * 97%) calc(var(--active) * 10%)) inset;
    background: var(--bg);
  }

  .space-button:active .text {
    font-weight: 300;
    animation:
      wobble 0.6s ease-in-out infinite,
      blurMove 1.5s ease-in-out infinite;
    text-shadow:
      5px 5px 20px rgba(255, 255, 255, 0.8),
      10px 10px 30px rgba(255, 0, 255, 0.6);
  }

  @keyframes wobble {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-2px, -10px); }
    50% { transform: translate(2px, 3px); }
    75% { transform: translate(-1px, 5px); }
  }

  @keyframes blurMove {
    0%, 100% { text-shadow: 5px 5px 20px rgba(255, 255, 255, 0.8), 10px 10px 30px rgba(255, 0, 255, 0.6); }
    50% { filter: blur(1px); text-shadow: 10px 10px 25px rgba(255, 255, 255, 0.8), 15px 15px 35px rgba(255, 0, 255, 0.6); }
  }

  .galaxy::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    opacity: 1;
    box-shadow:
      10vw 5vh #fff,
      25vw 10vh #fff,
      40vw 20vh #fff,
      5vw 30vh #fff,
      15vw 15vh #fff,
      50vw 25vh #fff,
      60vw 40vh #fff,
      70vw 35vh #fff,
      35vw 50vh #fff,
      80vw 15vh #fff,
      90vw 10vh #fff,
      95vw 5vh #fff,
      5vw 60vh #fff,
      20vw 65vh #fff,
      30vw 70vh #fff,
      45vw 55vh #fff,
      55vw 45vh #fff,
      65vw 35vh #fff,
      75vw 25vh #fff,
      85vw 15vh #fff;
    z-index: -1;
    transition: all 1.5s ease-in-out;
    animation: 1s glowing-stars linear alternate infinite;
    animation-delay: 0.4s;
  }

  .galaxy::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    opacity: 1;
    box-shadow:
      20vw 60vh #fff,
      30vw 55vh #fff,
      45vw 50vh #fff,
      55vw 65vh #fff,
      65vw 30vh #fff,
      75vw 40vh #fff,
      85vw 25vh #fff,
      10vw 45vh #fff,
      15vw 5vh #fff,
      35vw 10vh #fff,
      50vw 5vh #fff,
      25vw 35vh #fff,
      60vw 0vh #fff,
      40vw 70vh #fff,
      70vw 15vh #fff,
      80vw 20vh #fff,
      90vw 30vh #fff,
      5vw 25vh #fff,
      15vw 40vh #fff,
      25vw 50vh #fff;
    z-index: -1;
    transition: all 2s ease-in-out;
    animation: 1s glowing-stars linear alternate infinite;
    animation-delay: 0.8s;
  }

  .space-button {
    position: relative;
  }

  .galaxy {
    position: absolute;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    translate: none;
    overflow: hidden;
    opacity: var(--active);
    transition: opacity 0.25s;
  }

  .backdrop {
    position: absolute;
    inset: var(--cut);
    background: var(--bg);
    border-radius: 2rem;
    transition: background 0.25s;
  }

  @keyframes shootingStar {
    0% { transform: translateX(0) translateY(0); opacity: 1; }
    50% { transform: translateX(-55em) translateY(0); opacity: 1; }
    70% { transform: translateX(-70em) translateY(0); opacity: 0; }
    100% { transform: translateX(0) translateY(0); opacity: 0; }
  }

  @keyframes glowing-stars {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }

  .text {
    translate: 2% -6%;
    letter-spacing: 0.01ch;
    color: hsl(0 0% calc(60% + (var(--active) * 26%)));
    z-index: 999;
    padding: 0 34px;
    font-weight: 600;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .text::before {
    content: "";
    position: absolute;
    top: -290%;
    left: 90%;
    rotate: -45deg;
    width: 5em;
    height: 1px;
    background: linear-gradient(90deg, #ffffff, transparent);
    animation: 4s shootingStar ease-in-out infinite;
    transition: 1s ease;
    z-index: -1;
    animation-delay: 1s;
    display: none;
  }

  .text::after {
    content: "";
    display: none;
    position: absolute;
    top: -290%;
    left: 10%;
    rotate: -45deg;
    width: 5em;
    height: 1px;
    background: linear-gradient(90deg, #ffffff, transparent);
    animation: 7s shootingStar ease-in-out infinite;
    animation-delay: 3s;
  }

  .space-button:hover .text::before,
  .space-button:hover .text::after {
    display: block;
  }

  @supports (selector(:has(:is(+ *)))) {
    body:has(button:is(:hover, :focus-visible)) {
      --active: 1;
      --play-state: running;
    }
    .bodydrop {
      display: none;
    }
  }

  .space-button:is(:hover, :focus-visible) ~ :is(.bodydrop, .particle-pen) {
    --active: 1;
    --play-state: running;
  }

  .space-button:is(:hover, :focus-visible) {
    --active: 1;
    --play-state: running;
  }

  .galaxy-button {
    position: relative;
  }
`;

const Stars = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  background: transparent;

  &::before {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    box-shadow: 
      ${Array.from({ length: 50 }, () => `${Math.random() * 100}vw ${Math.random() * 100}vh #fff`).join(',')};
    animation: twinkle 3s infinite alternate;
  }

  &::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    box-shadow: 
      ${Array.from({ length: 50 }, () => `${Math.random() * 100}vw ${Math.random() * 100}vh #fff`).join(',')};
    animation: twinkle 3s infinite alternate 1.5s;
  }

  & .meteor {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 10px #fff;
    animation: meteor 9.6s linear infinite;
    transform-origin: 50% 50%;
  }

  @keyframes twinkle {
    from { opacity: 0.4; }
    to { opacity: 0.9; }
  }

  @keyframes meteor {
    0% {
      transform: translateX(${Math.random() * 100}vw) translateY(${Math.random() * -100}vh) rotate(${Math.random() * 360}deg);
      opacity: 0;
    }
    50% {
      transform: translateX(${Math.random() * -100}vw) translateY(${Math.random() * 100}vh) rotate(${Math.random() * -360}deg);
      opacity: 1;
    }
    100% {
      transform: translateX(${Math.random() * -200}vw) translateY(${Math.random() * 200}vh) rotate(${Math.random() * 360}deg);
      opacity: 0;
    }
  }
`;

const Animations = styled.style`
  @keyframes pulse {
    0% { background: linear-gradient(to bottom, #0a0a2a, #1a1a4a); }
    50% { background: linear-gradient(to bottom, #0f0f35, #1b1b4b); }
    100% { background: linear-gradient(to bottom, #0a0a2a, #1a1a4a); }
  }

  @keyframes shootingStar {
    0% { transform: translateX(0) translateY(0); opacity: 1; }
    50% { transform: translateX(-55em) translateY(0); opacity: 1; }
    70% { transform: translateX(-70em) translateY(0); opacity: 0; }
    100% { transform: translateX(0) translateY(0); opacity: 0; }
  }

  @keyframes glowing-stars {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes wobble {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-2px, -10px); }
    50% { transform: translate(2px, 3px); }
    75% { transform: translate(-1px, 5px); }
  }

  @keyframes blurMove {
    0%, 100% { text-shadow: 5px 5px 20px rgba(255, 255, 255, 0.8), 10px 10px 30px rgba(255, 0, 255, 0.6); }
    50% { filter: blur(1px); text-shadow: 10px 10px 25px rgba(255, 255, 255, 0.8), 15px 15px 35px rgba(255, 0, 255, 0.6); }
  }
`;

function Auth() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      console.log('Initiating Twitch login');
      const response = await signIn('twitch', { callbackUrl: '/profile', redirect: true });
      if (!response.ok) {
        throw new Error('Failed to initiate Twitch login');
      }
    } catch (error) {
      console.error('Error initiating Twitch login:', error);
      alert('Не удалось войти через Twitch. Проверь настройки или попробуй позже.');
    }
  };

  React.useEffect(() => {
    // Генерируем несколько метеоров с случайными стартовыми позициями по всему экрану
    const stars = document.querySelector('.stars');
    for (let i = 0; i < 15; i++) { // Увеличил до 15 метеоров
      const meteor = document.createElement('div');
      meteor.className = 'meteor';
      const startX = Math.random() * 100; // Случайный X от 0 до 100vw
      const startY = Math.random() * 100; // Случайный Y от 0 до 100vh (чтобы спавнились по всему экрану)
      const angle = Math.random() * 360; // Случайный угол вращения
      meteor.style.transform = `translateX(${startX}vw) translateY(${startY}vh) rotate(${angle}deg)`;
      meteor.style.setProperty('--i', `${i * 0.6}s`); // Разные задержки для метеоров
      stars.appendChild(meteor);
    }
  }, []);

  return React.createElement(
    Container,
    null,
    [
      React.createElement(Stars, { className: 'stars' }),
      React.createElement(Logo, { src: '/logo.png', alt: 'Streamers Universe Logo' }),
      React.createElement(
        GalaxyButton,
        { className: 'galaxy-button' },
        React.createElement(
          'button',
          {
            className: 'space-button',
            onClick: handleLogin,
          },
          [
            React.createElement('span', { className: 'backdrop' }),
            React.createElement('span', { className: 'galaxy' }),
            React.createElement('label', { className: 'text' }, 'Войти через Twitch')
          ]
        )
      ),
      React.createElement(Animations, null)
    ]
  );
}

module.exports = Auth;
