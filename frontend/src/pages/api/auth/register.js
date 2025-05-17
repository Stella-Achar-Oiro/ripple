// frontend/src/pages/api/auth/register.js
import { withCookies } from '../middleware';

function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Mock registration functionality
    const { email, password, firstName, lastName, dateOfBirth, nickname, aboutMe } = req.body;
    
    // In a real app, you would validate inputs and check if user already exists
    if (!email || !password || !firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Set a cookie for authentication
    res.setHeader('Set-Cookie', `auth=mocktoken; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 7}`);
    
    // Return the newly created user
    return res.status(200).json({
      id: '1',
      email,
      firstName,
      lastName,
      nickname: nickname || null,
      aboutMe: aboutMe || null,
      avatarPath: null,
      isPublic: true,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withCookies(handler);