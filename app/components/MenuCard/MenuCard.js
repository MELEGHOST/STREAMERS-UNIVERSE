'use client';

import Link from 'next/link';
import styles from './MenuCard.module.css';

const MenuCard = ({ href, icon, label, description, isActive, onPointerEnter }) => {
  return (
    <li className={styles.listItem} data-active={isActive} onPointerEnter={onPointerEnter}>
      <Link href={href} className={styles.linkWrapper}>
        {/* Collapsed View */}
        <div className={styles.collapsedView}>
          <div className={styles.icon}>{icon}</div>
          <h3 className={styles.labelVertical}>{label}</h3>
        </div>

        {/* Expanded View */}
        <div className={styles.expandedView}>
          <h4 className={styles.labelHorizontal}>{label}</h4>
          <p className={styles.description}>{description}</p>
          <span className={styles.cta}>Перейти &rarr;</span>
        </div>
      </Link>
    </li>
  );
};

export default MenuCard; 