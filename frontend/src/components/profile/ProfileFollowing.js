// frontend/src/components/profile/ProfileFollowing.js
import { useState, useEffect } from 'react';
import Link from 'next/link';

const ProfileFollowing = ({ userId }) => {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchFollowing = async () => {
      setLoading(true);
      
      try {
        // In a real app, we'd fetch following from the API
        // For now, let's use mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockFollowing = [
          {
            id: '3',
            firstName: 'John',
            lastName: 'Smith',
            nickname: 'johnsmith',
            avatarPath: null,
          },
          {
            id: '4',
            firstName: 'Emily',
            lastName: 'Johnson',
            nickname: 'emilyjohnson',
            avatarPath: null,
          },
          {
            id: '5',
            firstName: 'Michael',
            lastName: 'Brown',
            nickname: 'michaelbrown',
            avatarPath: null,
          },
        ];
        
        setFollowing(mockFollowing);
      } catch (error) {
        console.error('Error fetching following:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFollowing();
  }, [userId]);
  
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center p-4 border border-gray-200 rounded-lg animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="w-24 h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (following.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Not following anyone yet.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {following.map((user) => (
        <div 
          key={user.id} 
          className="flex items-center p-4 bg-white border border-gray-200 rounded-lg"
        >
          <Link href={`/profile/${user.id}`}>
            <div className="flex items-center flex-1">
              <div className="w-12 h-12 bg-navy-200 rounded-full flex items-center justify-center text-navy-700 font-bold">
                {user.avatarPath ? (
                  <img 
                    src={user.avatarPath} 
                    alt={`${user.firstName} ${user.lastName}`} 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <>
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </>
                )}
              </div>
              <div className="ml-4">
                <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
                <p className="text-sm text-gray-500">@{user.nickname}</p>
              </div>
            </div>
          </Link>
          
          <button 
            className="px-3 py-1.5 bg-gray-100 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Unfollow
          </button>
        </div>
      ))}
    </div>
  );
};

export default ProfileFollowing;