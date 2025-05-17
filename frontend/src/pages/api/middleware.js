// frontend/src/pages/api/middleware.js

// Helper function to parse cookies from request
export function parseCookies(req) {
  const cookie = req.headers?.cookie;
  if (!cookie) return {};
  
  return cookie.split(';').reduce((res, item) => {
    const [key, value] = item.trim().split('=');
    return { ...res, [key]: value };
  }, {});
}

// Add this to any API route that needs cookies
export function withCookies(handler) {
  return (req, res) => {
    req.cookies = parseCookies(req);
    return handler(req, res);
  };
}