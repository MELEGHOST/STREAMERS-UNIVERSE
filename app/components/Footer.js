import React from 'react';
import Image from 'next/image';
import styles from './Footer.module.css'; // Предполагаем, что создадим этот файл стилей

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Ссылки на ваши социальные сети (замените # на реальные ссылки)
  const socialLinks = {
    twitter: '#',
    discord: '#',
    telegram: '#',
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.copyright}>
          © {currentYear} Streamers Universe. Все права защищены.
        </div>
        <div className={styles.socialIcons}>
          {socialLinks.twitter !== '#' && (
            <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <Image 
                src="/assets/icons/twitter.svg" // Путь от папки public
                alt="Twitter"
                width={24} 
                height={24} 
                className={styles.icon}
              />
            </a>
          )}
          {socialLinks.discord !== '#' && (
            <a href={socialLinks.discord} target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <Image 
                src="/assets/icons/discord.svg" // Путь от папки public
                alt="Discord"
                width={24} 
                height={24} 
                className={styles.icon}
              />
            </a>
          )}
          {socialLinks.telegram !== '#' && (
            <a href={socialLinks.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
              <Image 
                src="/assets/icons/telegram.svg" // Путь от папки public
                alt="Telegram"
                width={24} 
                height={24} 
                className={styles.icon}
              />
            </a>
          )}
        </div>
        {/* 
          Здесь можно добавить ссылки на Политику конфиденциальности и Условия использования, 
          когда соответствующие страницы будут созданы.
          <div className={styles.links}>
            <Link href="/privacy-policy">Политика конфиденциальности</Link>
            <Link href="/terms-of-service">Условия использования</Link>
          </div> 
        */}
      </div>
    </footer>
  );
};

export default Footer;
