export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // API маршруты выполняются на сервере, поэтому не можем использовать localStorage
    // Вместо этого просто очищаем куки на клиенте через ответ
    res.setHeader('Set-Cookie', [
      'token=; Path=/; Max-Age=0',
      'user=; Path=/; Max-Age=0'
    ]);

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error in /api/auth/logout:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
