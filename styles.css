body {
    font-family: 'Arial', sans-serif;
    background: #0a0a2a; /* Глубоко тёмный космический фон */
    margin: 0;
    padding: 20px;
    color: #fff;
    min-height: 100vh; /* Полное покрытие высоты экрана */
    overflow-x: hidden;
    position: relative;
}

/* Звёзды через CSS (равномерное распределение) */
body::before, body::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%; /* Полное покрытие высоты */
    z-index: -1;
    pointer-events: none; /* Не мешает кликам */
    background: transparent;
}

body::before {
    background: radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.15) 0.8px, transparent 0.8px),
                radial-gradient(circle at 30% 70%, rgba(255, 255, 255, 0.25) 1.2px, transparent 1.2px),
                radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0.5px, transparent 0.5px);
    background-size: 100px 100px; /* Равномерное распределение */
    animation: twinkle 4s infinite ease-in-out;
    opacity: 0.5; /* Лёгкая прозрачность для эффекта космоса */
}

body::after {
    background: radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.3) 1.5px, transparent 1.5px),
                radial-gradient(circle at 20% 90%, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                radial-gradient(circle at 60% 40%, rgba(255, 255, 255, 0.15) 0.8px, transparent 0.8px);
    background-size: 150px 150px;
    animation: twinkle 6s infinite ease-in-out reverse;
    opacity: 0.4; /* Лёгкая прозрачность для эффекта слоёв */
}

@keyframes twinkle {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.9; }
}

.container {
    max-width: 600px;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    padding: 20px;
    border-radius: 15px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    position: relative;
    z-index: 1; /* Над звёздами */
}

.title {
    font-size: 2.5em;
    text-align: center;
    background: linear-gradient(45deg, #4a4a9d, #8a8aff);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    margin-bottom: 20px;
}

.menu, .frame {
    display: none;
}

.menu.active, .frame.active {
    display: block;
}

.frame {
    padding: 20px 0;
}

button {
    background: linear-gradient(45deg, #4a4a9d, #8a8aff);
    color: white;
    border: none;
    padding: 12px 24px;
    margin: 5px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 1em;
    transition: transform 0.3s, background 0.3s;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    display: inline-block;
    opacity: 1;
    visibility: visible;
    width: auto;
}

button:hover {
    transform: scale(1.05);
    background: linear-gradient(45deg, #6b6bd7, #a6a6ff);
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.input-field {
    width: 100%;
    padding: 10px;
    margin: 10px 0;
    border: none;
    border-radius: 25px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 1em;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    outline: none;
}

.input-field:focus {
    background: rgba(255, 255, 255, 0.2);
}

.error {
    color: #ff4444;
    margin-top: 10px;
    display: none;
}

.error.active {
    display: block;
}

.profile-content {
    display: none;
}

.profile-content.active {
    display: block;
}

.item {
    background: rgba(255, 255, 255, 0.05);
    padding: 15px;
    margin: 5px 0;
    border-radius: 10px;
    border-left: 5px solid #8a8aff;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

#streamerSection .item {
    border-left-color: #4a4a9d;
}

#viewerSection .item {
    border-left-color: #4CAF50;
}

#profileHeader, .menu {
    background: rgba(255, 255, 255, 0.1);
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 20px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

#switchProfileBtn, #logoutBtn {
    background: linear-gradient(45deg, #ff6b6b, #ff8a8a);
    margin: 5px;
}

#switchProfileBtn:hover, #logoutBtn:hover {
    background: linear-gradient(45deg, #ff4444, #ff6666);
}
