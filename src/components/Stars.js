import React, { useEffect } from 'react';

const Stars = () => {
  useEffect(() => {
    const addRandomStars = () => {
      const body = document.body;
      for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.width = `${Math.random() * 3 + 1}px`;
        star.style.height = star.style.width;
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 5}s`;
        body.appendChild(star);
      }
    };
    addRandomStars();
  }, []);

  return null; // Компонент ничего не рендерит, только добавляет звёзды через JS
};

export default Stars;
