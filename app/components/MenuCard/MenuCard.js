'use client';

import Link from 'next/link';
import styles from './MenuCard.module.css';

const MenuCard = ({ href, icon, label, description, isActive }) => {
  return (
    <li className={styles.listItem} data-active={isActive}>
      <Link href={href} className={styles.linkWrapper}>
        <article className={styles.article}>
          {/* This is the vertical title for when the card is collapsed */}
          <h3 className={styles.title}>{label}</h3>
          
          {/* These elements appear when the card is active/expanded */}
          <div className={styles.iconWrapper}>{icon}</div>
          <h4 className={styles.label}>{label}</h4>
          {description && <p className={styles.description}>{description}</p>}
          <span className={styles.cta}>Перейти &rarr;</span>
        </article>
      </Link>
    </li>
  );
};

export default MenuCard; 