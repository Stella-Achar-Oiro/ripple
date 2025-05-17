
// frontend/src/pages/api/auth/me.js
import { withCookies } from '../middleware';

function handler(req, res) {
  // Check if the auth cookie exists
  const authCookie = req.cookies.auth;
  
  if (!authCookie) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // In a real app, you would verify the token and fetch user data
  // For now, we'll return mock data based on the presence of the cookie
  return res.status(200).json({
    id: '1',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    nickname: 'testuser',
    avatarPath: null,
    aboutMe: 'This is a test user account.',
    isPublic: true,
  });
}

export default withCookies(handler);