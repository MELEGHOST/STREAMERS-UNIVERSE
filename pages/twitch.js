"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import styles from './twitch.module.css';

export default function Twitch() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return <div className={styles.error}>Please log in</div>;
  }

  return (
    <div className={styles.twitchContainer}>
      <h1>Twitch Integration</h1>
      <p>Connect and manage your Twitch streams here.</p>
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
