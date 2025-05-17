// frontend/src/pages/api/auth/login.js
import { withCookies } from '../middleware';

function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Mock login functionality
  const { email, password } = req.body;
  
  // In a real app, you would validate against your database
  if (email === 'user@example.com' && password === 'password') {
    // Set a cookie for authentication
    res.setHeader('Set-Cookie', `auth=mocktoken; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 7}`);
    
    return res.status(200).json({
      id: '1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      nickname: 'testuser',
      avatarPath: null,
      isPublic: true,
    });
  }
  
  return res.status(401).json({ message: 'Invalid credentials' });
}

export default withCookies(handler);