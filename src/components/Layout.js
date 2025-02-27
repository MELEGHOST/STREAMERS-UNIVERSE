// src/components/Layout.js
'use client';

import React, { useEffect } from 'react';
import Stars from './Stars';
import { initTelegramApp } from '../utils/telegramInit';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Initialize Telegram Mini App
    const isTelegramApp = initTelegramApp();
    if (!isTelegramApp) {
      console.log('Running outside of Telegram Mini App environment');
    }
    
    // Add viewport meta tag for better mobile experience
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(meta);
  }, []);

  return (
    <div className="app-container">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="main-content"
      >
        <header className="app-header">
          <div className="logo-container">
            <Link href="/">
              <img src="/logo.png" alt="Streamers Universe" className="logo" />
            </Link>
            <h1 className="app-title">Streamers Universe</h1>
          </div>
          
          {isAuthenticated && (
            <nav className="header-nav">
              <button 
                onClick={() => router.push('/profile')}
                className={`nav-button ${router.pathname === '/profile' ? 'active' : ''}`}
              >
                Profile
              </button>
              <button 
                onClick={() => router.push('/twitch')}
                className={`nav-button ${router.pathname === '/twitch' ? 'active' : ''}`}
              >
                Twitch
              </button>
              <button 
                onClick={() => router.push('/top')}
                className={`nav-button ${router.pathname === '/top' ? 'active' : ''}`}
              >
                Top
              </button>
            </nav>
          )}
        </header>
        
        <main className="content-area">
          {children}
        </main>
        
        <Stars />
      </motion.div>
    </div>
  );
};

export default Layout;
</document_content>
