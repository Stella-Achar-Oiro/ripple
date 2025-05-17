// frontend/src/pages/profile/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileIndex() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        router.replace(`/profile/${user.id}`);
      } else if (!isAuthenticated) {
        router.replace('/login');
      }
    }
  }, [user, isAuthenticated, loading, router]);
  
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-navy-600"></div>
    </div>
  );
}