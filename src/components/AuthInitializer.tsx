'use client';

import { useEffect, useState } from 'react';
import useAuthStore from '@/store/auth';
import { usePathname, useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register'];

export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, initializeUser, isLoading } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
    const initialize = async () => {
      await initializeUser();
      setIsInitialized(true);
    };
    
    initialize();
  }, [initializeUser]);
  
  useEffect(() => {
    if (isInitialized) {
      // If user is not authenticated and trying to access a protected route
      if (!user && !publicRoutes.includes(pathname)) {
        router.push('/login');
      }
      
      // If user is authenticated and trying to access a public route
      if (user && publicRoutes.includes(pathname)) {
        router.push('/');
      }
    }
  }, [user, pathname, router, isInitialized]);
  
  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }
  
  return <>{children}</>;
}