'use client';

import Link from 'next/link';
import styles from './MenuCard.module.css';

const MenuCard = ({ href, icon, label, description, isActive, onPointerMove, onFocus, onClick }) => {
  return (
    <li 
      className={styles.listItem} 
      data-active={isActive}
      onPointerMove={onPointerMove}
      onFocus={onFocus}
      onClick={onClick}
      tabIndex="0"
    >
      <article className={styles.article}>
        <h3 className={styles.verticalTitle}>{label}</h3>
        {icon}
        <p className={styles.description}>{description}</p>
        <Link href={href} className={styles.link}>
          <span>{label}</span>
        </Link>
      </article>
    </li>
  );
};

export default MenuCard; 