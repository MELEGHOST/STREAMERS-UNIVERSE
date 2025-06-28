'use client';

import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>404 - Сторінку не знайдено</h1>
      <p className={styles.description}>Вибачте, сторінка, яку ви шукаєте, не існує.</p>
      <Link href="/" className={styles.link}>
        Повернутися на головну
      </Link>
    </div>
  );
} 