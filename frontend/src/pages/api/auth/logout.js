// frontend/src/pages/api/auth/logout.js
import { withCookies } from '../middleware';

function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Clear the auth cookie
  res.setHeader('Set-Cookie', 'auth=; Path=/; HttpOnly; Max-Age=0');
  
  return res.status(200).json({ message: 'Logged out successfully' });
}
export default withCookies(handler);