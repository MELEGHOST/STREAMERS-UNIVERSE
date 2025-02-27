// Главная страница для выбора роли
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';

function HomePage() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    console.log('Role selection logic');
  }, []);

  return _jsxs("div", {
    children: [
      _jsx("h1", { children: "Выберите роль" }),
      _jsx("button", { onClick: () => setRole('streamer'), children: "Я стример" }),
      _jsx("button", { onClick: () => setRole('subscriber'), children: "Я подписчик" })
    ]
  });
}

export default HomePage;
