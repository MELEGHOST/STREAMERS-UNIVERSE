async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Логика обмена кода на токен Twitch
  res.status(200).json({ token: 'example_token' });
}

module.exports = handler;
