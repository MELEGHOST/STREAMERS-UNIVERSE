async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Логика получения данных пользователя
  res.status(200).json({ user: 'example_user' });
}

module.exports = handler;
