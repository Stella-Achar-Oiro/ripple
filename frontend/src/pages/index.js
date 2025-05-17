// frontend/src/pages/index.js
import { useAuth } from '../contexts/AuthContext';
import Feed from '../components/posts/Feed';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <h1 className="text-4xl font-bold text-navy-600 mb-6">Ripple</h1>
        <p className="text-gray-600 text-center max-w-md">
          Welcome to Ripple, a modern social network platform. Please login to continue.
        </p>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy-800">Home Feed</h1>
      </div>
      
      <Feed />
    </div>
  );
}