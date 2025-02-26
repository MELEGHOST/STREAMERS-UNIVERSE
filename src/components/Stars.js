'use client';

import React, { useMemo } from 'react';

const Stars = () => {
  // Create an array of random stars using useMemo to prevent re-rendering
  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, index) => ({
      key: index,
      size: Math.random() * 3 + 1,
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="stars-container">
      {stars.map((star) => (
        <div
          key={star.key}
          className="star"
          style={{
            width: `${star.size}px`,
            height: `${star.size}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default Stars;
