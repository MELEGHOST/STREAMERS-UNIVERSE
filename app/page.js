import Link from 'next/link';
import styles from './home.module.css';

export default function HomePage() {
  return (
    <div className={styles.container}>
      <h1>Добро пожаловать в Streamers Universe!</h1>
      <p>
        Ваша новая платформа для взаимодействия со стримерами, просмотра контента и участия в жизни сообщества.
      </p>
      <div className={styles.ctaContainer}>
        {/* Ссылка будет вести на /auth, когда мы его создадим */}
        <Link href="/auth" className={styles.ctaButton}>
          Войти через Twitch
        </Link>
      </div>
    </div>
  );
} 