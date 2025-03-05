"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import styles from './top.module.css';

export default function Top() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [topStreamers, setTopStreamers] = useState([]);

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
      // Здесь можно добавить API-запрос для получения топа стримеров
      setTopStreamers([
        { name: 'Streamer1', rating: 4.5, followers: 1000 },
        { name: 'Streamer2', rating: 4.0, followers: 800 },
      ]);
    }
  }, []);

  if (!isAuthenticated) {
    return <div className={styles.error}>Please log in</div>;
  }

  return (
    <div className={styles.topContainer}>
      <h1>Top Streamers</h1>
      {topStreamers.map((streamer, index) => (
        <div key={index} className={styles.streamerItem}>
          {`${index + 1}. ${streamer.name} - Rating: ${streamer.rating}, Followers: ${streamer.followers}`}
        </div>
      ))}
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
