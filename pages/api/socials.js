export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  try {
    if (req.method === 'GET') {
      const socialLinks = JSON.parse(localStorage.getItem(`socialLinks_${userId}`)) || {};
      res.status(200).json(socialLinks);
    } else if (req.method === 'POST') {
      const { socialLinks } = req.body;
      localStorage.setItem(`socialLinks_${userId}`, JSON.stringify(socialLinks));
      res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Socials API error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
