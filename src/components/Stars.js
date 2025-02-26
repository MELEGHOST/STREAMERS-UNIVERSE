import React from 'react';

const Stars = () => {
  // Создаём массив случайных звёзд
  const stars = Array.from({ length: 50 }, (_, index) => ({
    key: index,
    size: Math.random() * 3 + 1,
    top: Math.random() * 100,
    left: Math.random() * 100,
    delay: Math.random() * 5,
  }));

  return (
    <div className="stars-container">
      {stars.map((star) => (
        <div
          key={star.key}
          className="star"
          style={{
            position: 'absolute',
            width: `${star.size}px`,
            height: `${star.size}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            background: 'white',
            borderRadius: '50%',
            animation: 'twinkle 3s infinite alternate',
            pointerEvents: 'none',
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default Stars;
