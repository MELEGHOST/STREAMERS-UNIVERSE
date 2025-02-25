// API-маршрут для безопасной передачи конфигурации клиенту
export default function handler(req, res) {
  // Передаем только то, что нужно клиенту
  // Не включайте секреты, которые должны оставаться только на сервере
  res.status(200).json({
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    // Для redirect_uri используем публичный URL
    TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI
  });
}
