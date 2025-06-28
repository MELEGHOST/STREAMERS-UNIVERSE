'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './HoldLoginButton.module.css';
import { useTranslation } from 'react-i18next';

const HoldLoginButton = () => {
    const router = useRouter();
    const { t } = useTranslation('common');

    const handleButtonClick = () => {
        router.push('/menu');
    };
    
    return (
        <div className={styles.container}>
            <button 
                className={styles.holdButton} 
                onClick={handleButtonClick}
            >
                {t('enterMenu', 'Войти в меню')}
            </button>
        </div>
    );
};

export default HoldLoginButton; 