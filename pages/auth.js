// pages/auth.js
const React = require('react');
const { useRouter } = require('next/router');
const styled = require('styled-components').default;

const Container = styled.div`
  background: linear-gradient(to bottom, #000022, #000044); /* Потемнее тёмно-синий, как на главной */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: 'Arial', sans-serif;
  overflow: hidden;
  position: relative;
  transition: all 0.5s ease-in-out; /* Плавный переход фона */
`;

const Logo = styled.img`
  max-width: 200px;
  margin-bottom: 40px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  animation: fadeIn 1s ease-in-out forwards;
`;

const Button = styled.button`
  --cut: 0.1em;
  --active: 0;
  --bg: radial-gradient(
    120% 120% at 126% 126%,
    hsl(245 calc(var(--active) * 97%) 98% / calc(var(--active) * 0.9)) 40%,
    transparent 50%
  ) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
  radial-gradient(
    120% 120% at 120% 120%,
    hsl(245 calc(var(--active) * 97%) 70% / calc(var(--active) * 1)) 30%,
    transparent 70%
  ) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
  hsl(245 calc(var(--active) * 100%) calc(12% - (var(--active) * 8%)));
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
  box-shadow: 0 0 calc(var(--active) * 6em) calc(var(--active) * 3em) hsl(245 97% 61% / 0.5),
    0 0.05em 0 0 hsl(245 calc(var(--active) * 97%) calc((var(--active) * 50%) + 30%)) inset,
    0 -0.05em 0 0 hsl(245 calc(var(--active) * 97%) calc(var(--active) * 10%)) inset;
  transition: box-shadow 0.25s ease-out, scale 0.25s, background 0.25s, transform 0.5s ease-in-out;
  scale: calc(1 + (var(--active) * 0.1));
  transform-style: preserve-3d;
  perspective: 100vmin;
  overflow: hidden;
  animation: slideIn 1s ease-in-out 0.5s forwards; /* Плавный вход кнопки */

  &:hover {
    --active: 1;
    transform: scale(1.1) translateY(-5px);
  }

  &:active {
    scale: 1;
    --bg: radial-gradient(
        120% 120% at 126% 126%,
        hsl(245 calc(var(--active) * 97%) 98% / calc(var(--active) * 0.9)) 40%,
        transparent 50%
      ) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      radial-gradient(
        120% 120% at 120% 120%,
        hsl(245 calc(var(--active) * 97%) 70% / calc(var(--active) * 1)) 30%,
        transparent 70%
      ) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      hsl(245 calc(var(--active) * 100%) calc(12% - (var(--active) * 8%)));
    box-shadow: 0 0 calc(var(--active) * 6em) calc(var(--active) * 3em) hsl(245 97% 61% / 0.5),
      0 0.05em 0 0 hsl(245 calc(var(--active) * 97%) calc((var(--active) * 50%) + 30%)) inset,
      0 -0.05em 0 0 hsl(245 calc(var(--active) * 97%) calc(var(--active) * 10%)) inset;
    background: var(--bg);
  }

  &:active .text {
    font-weight: 300;
    animation: wobble 0.6s ease-in-out infinite, blurMove 1.5s ease-in-out infinite;
    text-shadow: 5px 5px 20px rgba(255, 255, 255, 0.8), 10px 10px 30px rgba(255, 0, 255, 0.6);
  }
`;

const Text = styled.label`
  translate: 2% -6%;
  letter-spacing: 0.01ch;
  color: hsl(245 0% calc(60% + (var(--active) * 26%)));
  z-index: 999;
  padding: 0 34px;
  font-weight: 600;
`;

const Galaxy = styled.span`
  position: absolute;
  width: 100%;
  aspect-ratio: 1;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  overflow: hidden;
  opacity: var(--active);
  transition: opacity 0.25s;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    opacity: 0.8;
    box-shadow: 140px 20px #fff, 425px 20px #fff, 70px 120px #fff, 20px 130px #fff, 110px 80px #fff, 280px 80px #fff, 250px 350px #fff, 280px 230px #fff, 220px 190px #fff, 450px 100px #fff, 380px 80px #fff, 520px 50px #fff;
    z-index: -1;
    transition: all 1.5s ease-in-out;
    animation: 1s glowing-stars linear alternate infinite;
    animation-delay: 0.4s;
  }

  &::after {
    content: "";
    position: absolute;
    top: -150px;
    left: -65px;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    opacity: 0.8;
    box-shadow: 490px 330px #fff, 420px 300px #fff, 320px 280px #fff, 380px 350px #fff, 546px 170px #fff, 420px 180px #fff, 370px 150px #fff, 200px 250px #fff, 80px 20px #fff, 190px 50px #fff, 270px 20px #fff, 120px 230px #fff, 350px -1px #fff, 150px 369px #fff;
    z-index: -1;
    transition: all 2s ease-in-out;
    animation: 1s glowing-stars linear alternate infinite;
    animation-delay: 0.8s;
  }
`;

const Backdrop = styled.span`
  position: absolute;
  inset: var(--cut);
  background: var(--bg);
  border-radius: 2rem;
  transition: background 0.25s;
`;

const Animations = styled.style`
  @keyframes fadeIn {
    0% { opacity: 0; transform: translate(-50%, -60%); }
    100% { opacity: 1; transform: translate(-50%, -50%); }
  }

  @keyframes slideIn {
    0% { opacity: 0; transform: translateY(50px); }
    100% { opacity: 1; transform: translateY(0); }
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

  @keyframes shootingStar {
    0% { transform: translateX(0) translateY(0); opacity: 1; }
    50% { transform: translateX(-55em) translateY(0); opacity: 1; }
    70% { transform: translateX(-70em) translateY(0); opacity: 0; }
    100% { transform: translateX(0) translateY(0); opacity: 0; }
  }

  @keyframes glowing-stars {
    0% { opacity: 0; }
    50% { opacity: 0.8; }
    100% { opacity: 0; }
  }
`;

function Auth() {
  const router = useRouter();
  const { role } = router.query;

  const handleTwitchLogin = async () => {
    try {
      console.log('Initiating Twitch login with role:', role);
      const response = await fetch('/api/auth/twitch', { method: 'GET' });
      if (response.ok) {
        const { url } = await response.json();
        console.log('Twitch auth URL:', url);
        window.location.href = url + (role ? `&state=${role}` : '');
      } else {
        console.error('Failed to initiate Twitch login:', await response.text());
      }
    } catch (err) {
      console.error('Error initiating Twitch login:', err);
    }
  };

  return React.createElement(
    Container,
    null,
    [
      React.createElement(Logo, { src: '/logo.png', alt: 'Streamers Universe Logo' }),
      React.createElement(
        Button,
        {
          onClick: handleTwitchLogin,
        },
        [
          React.createElement(Backdrop, { className: 'backdrop' }),
          React.createElement(Galaxy, { className: 'galaxy' }),
          React.createElement(Text, { className: 'text' }, 'Войти через Twitch')
        ]
      ),
      React.createElement(Animations, null) // Вставляем анимации
    ]
  );
}

module.exports = Auth;
