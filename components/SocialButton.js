import React from 'react';
import styles from './SocialButton.module.css';

const SocialButton = ({ type, url, username, subscribers }) => {
  // Определяем цвет и иконку в зависимости от типа социальной сети
  const getSocialConfig = (type) => {
    const socialType = (type || '').toLowerCase();
    
    switch (socialType) {
      case 'twitch':
        return {
          color: '#9146ff',
          icon: (
            <svg
              fill="#fff"
              xmlns="http://www.w3.org/2000/svg"
              version="1.1"
              viewBox="0 0 24 24"
            >
              <path
                fill="#9146ff"
                d="M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.269-6.269v-14.686h-21.314zm19.164 13.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.194v11.463zm-3.582-7.343v6.262h-2.149v-6.262h2.149zm-5.731 0v6.262h-2.149v-6.262h2.149z"
              ></path>
            </svg>
          ),
          initials: 'Tw'
        };
      case 'youtube':
        return {
          color: '#FF0000',
          icon: (
            <svg
              fill="#fff"
              xmlns="http://www.w3.org/2000/svg"
              version="1.1"
              viewBox="0 -7 48 48"
            >
              <g strokeWidth="0" id="SVGRepo_bgCarrier"></g>
              <g
                strokeLinejoin="round"
                strokeLinecap="round"
                id="SVGRepo_tracerCarrier"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <title>Youtube-color</title>
                <desc>Created with Sketch.</desc>
                <defs></defs>
                <g
                  fillRule="evenodd"
                  fill="none"
                  strokeWidth="1"
                  stroke="none"
                  id="Icons"
                >
                  <g transform="translate(-200.000000, -368.000000)" id="Color-">
                    <path
                      id="Youtube"
                      d="M219.044,391.269916 L219.0425,377.687742 L232.0115,384.502244 L219.044,391.269916 Z M247.52,375.334163 C247.52,375.334163 247.0505,372.003199 245.612,370.536366 C243.7865,368.610299 241.7405,368.601235 240.803,368.489448 C234.086,368 224.0105,368 224.0105,368 L223.9895,368 C223.9895,368 213.914,368 207.197,368.489448 C206.258,368.601235 204.2135,368.610299 202.3865,370.536366 C200.948,372.003199 200.48,375.334163 200.48,375.334163 C200.48,375.334163 200,379.246723 200,383.157773 L200,386.82561 C200,390.73817 200.48,394.64922 200.48,394.64922 C200.48,394.64922 200.948,397.980184 202.3865,399.447016 C204.2135,401.373084 206.612,401.312658 207.68,401.513574 C211.52,401.885191 224,402 224,402 C224,402 234.086,401.984894 240.803,401.495446 C241.7405,401.382148 243.7865,401.373084 245.612,399.447016 C247.0505,397.980184 247.52,394.64922 247.52,394.64922 C247.52,394.64922 248,390.73817 248,386.82561 L248,383.157773 C248,379.246723 247.52,375.334163 247.52,375.334163 L247.52,375.334163 Z"
                    ></path>
                  </g>
                </g>
              </g>
            </svg>
          ),
          initials: 'Yt'
        };
      case 'discord':
        return {
          color: '#5865F2',
          icon: (
            <svg 
              fill="#fff" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 127.14 96.36"
            >
              <path 
                fill="#5865F2"
                d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
              />
            </svg>
          ),
          initials: 'Ds'
        };
      case 'telegram':
        return {
          color: '#0088cc',
          icon: (
            <svg 
              fill="#fff" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24"
            >
              <path 
                fill="#0088cc"
                d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.269c-.145.658-.537.818-1.084.51l-3-2.21-1.446 1.394c-.14.18-.333.35-.683.35l.245-3.47 6.3-5.693c.275-.248-.06-.372-.42-.145l-7.733 4.868-3.33-1.05c-.724-.225-.736-.725.15-.975l12.99-5.008c.608-.222 1.122.14.98.975z"
              />
            </svg>
          ),
          initials: 'Tg'
        };
      case 'vk':
        return {
          color: '#4C75A3',
          icon: (
            <svg 
              fill="#fff" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24"
            >
              <path 
                fill="#4C75A3"
                d="M21.547 7h-3.29a.743.743 0 0 0-.655.392s-1.312 2.416-1.734 3.23C14.734 12.813 14 12.126 14 11.11V7.603A1.104 1.104 0 0 0 12.896 6.5h-2.474a1.982 1.982 0 0 0-1.75.813s1.255-.204 1.255 1.49c0 .42.022 1.626.04 2.64a.73.73 0 0 1-1.272.503 21.54 21.54 0 0 1-2.498-4.543.693.693 0 0 0-.63-.403h-2.99a.508.508 0 0 0-.48.685C3.005 10.175 6.918 18 11.38 18h1.878a.742.742 0 0 0 .742-.742v-1.135a.73.73 0 0 1 1.23-.53l2.247 2.112a1.09 1.09 0 0 0 .746.295h2.953c1.424 0 1.424-.988.647-1.753-.546-.538-2.518-2.617-2.518-2.617a1.02 1.02 0 0 1-.078-1.323c.637-.84 1.68-2.212 2.122-2.8.603-.804 1.697-2.507.197-2.507z"
              />
            </svg>
          ),
          initials: 'Vk'
        };
      case 'yandexmusic':
        return {
          color: '#FFCC00',
          icon: (
            <svg 
              fill="#fff" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24"
            >
              <path 
                fill="#FFCC00"
                d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10-10-4.477-10-10 4.477-10 10-10zm-1.5 5v10h3v-10h-3zm0 3v4h3v-4h-3z"
              />
            </svg>
          ),
          initials: 'Ym'
        };
      default:
        return {
          color: '#7B41C9',
          icon: (
            <svg 
              fill="#fff" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24"
            >
              <path 
                fill="#7B41C9"
                d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-2.426 14.741h-3.574v-.202l1.261-1.529c.134-.159.195-.333.195-.517 0-.142-.035-.263-.101-.366-.066-.102-.164-.153-.296-.153-.131 0-.229.051-.296.152-.067.102-.1.234-.1.395h-1.256c0-.401.118-.722.353-.964.234-.242.569-.363 1.003-.363.446 0 .791.132 1.028.397.238.264.357.601.357 1.009 0 .228-.043.439-.128.635-.086.196-.247.43-.485.702l-.766.89h1.805v.914zm2.368-3.741h-1.319v4.907h-1.319v-4.907h-1.319v-1.01h3.957v1.01zm4.058 3.741h-3.574v-.202l1.261-1.529c.134-.159.195-.333.195-.517 0-.142-.035-.263-.101-.366-.066-.102-.164-.153-.296-.153-.131 0-.229.051-.296.152-.067.102-.1.234-.1.395h-1.256c0-.401.118-.722.353-.964.234-.242.569-.363 1.003-.363.446 0 .791.132 1.028.397.238.264.357.601.357 1.009 0 .228-.043.439-.128.635-.086.196-.247.43-.485.702l-.766.89h1.805v.914z"
              />
            </svg>
          ),
          initials: 'Ln'
        };
    }
  };

  // Безопасно получаем конфигурацию
  const config = getSocialConfig(type);
  const safeUsername = username || 'username';
  const safeUrl = url || '#';

  // Проверяем, является ли URL действительным
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Обрабатываем клик по кнопке
  const handleClick = (e) => {
    if (!isValidUrl(safeUrl)) {
      e.preventDefault();
      console.error('Недействительный URL:', safeUrl);
      alert('Недействительная ссылка. Пожалуйста, проверьте URL.');
    }
  };

  return (
    <div className={styles.tooltipContainer} style={{'--color': config.color}}>
      <div className={styles.tooltip}>
        <div className={styles.profile}>
          <div className={styles.user}>
            <div className={styles.img} style={{backgroundColor: config.color}}>{config.initials}</div>
            <div className={styles.details}>
              <div className={styles.name} style={{color: config.color}}>{type || 'Соцсеть'}</div>
              <div className={styles.username}>@{safeUsername}</div>
            </div>
          </div>
          {subscribers && <div className={styles.about}>{subscribers} подписчиков</div>}
        </div>
      </div>
      <div className={styles.text}>
        <a 
          href={safeUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.icon}
          onClick={handleClick}
        >
          <div className={styles.layer} style={{backgroundColor: config.color, boxShadow: `0 5px 15px ${config.color}80`}}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span className={styles.svg}>
              {config.icon}
            </span>
          </div>
          <div className={styles.text} style={{color: config.color, fontWeight: 'bold'}}>{type || 'Соцсеть'}</div>
        </a>
      </div>
    </div>
  );
};

export default SocialButton; 