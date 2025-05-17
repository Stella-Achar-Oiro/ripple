// frontend/src/components/layout/Layout.js
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import NotificationPanel from '../notifications/NotificationPanel';
import MobileNav from './MobileNav';
import { useState, useEffect } from 'react';

const Layout = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register'];
  
  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // If loading, show a loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-navy-600"></div>
      </div>
    );
  }
  
  // If not authenticated and not on a public route, redirect to login
  if (!isAuthenticated && !publicRoutes.includes(router.pathname)) {
    // Only redirect on client side
    if (typeof window !== 'undefined') {
      router.push('/login');
      return null;
    }
    return null;
  }
  
  // If on a public route (login/register) or not authenticated, don't show sidebar
  if (publicRoutes.includes(router.pathname) || !isAuthenticated) {
    return <div className="min-h-screen bg-gray-50 font-poppins">{children}</div>;
  }
  
  // Mobile view
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 font-poppins">
        <div className="flex flex-col h-screen">
          <div className="flex-1 overflow-y-auto pb-16">
            {children}
          </div>
          <MobileNav />
        </div>
      </div>
    );
  }
  
  // Desktop view with sidebar for authenticated users
  return (
    <div className="flex min-h-screen bg-gray-50 font-poppins">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <NotificationPanel />
    </div>
  );
};

export default Layout;