import styles from './settings.module.css';

export default function Loading() {
  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Загрузка настроек...</p>
    </div>
  );
} 