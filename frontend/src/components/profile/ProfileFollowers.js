// frontend/src/components/profile/ProfileFollowers.js
import { useState, useEffect } from 'react';
import Link from 'next/link';

const ProfileFollowers = ({ userId }) => {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchFollowers = async () => {
      setLoading(true);
      
      try {
        // In a real app, we'd fetch followers from the API
        // For now, let's use mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockFollowers = [
          {
            id: '3',
            firstName: 'John',
            lastName: 'Smith',
            nickname: 'johnsmith',
            avatarPath: null,
            isFollowing: true,
          },
          {
            id: '4',
            firstName: 'Emily',
            lastName: 'Johnson',
            nickname: 'emilyjohnson',
            avatarPath: null,
            isFollowing: false,
          },
          {
            id: '5',
            firstName: 'Michael',
            lastName: 'Brown',
            nickname: 'michaelbrown',
            avatarPath: null,
            isFollowing: true,
          },
        ];
        
        setFollowers(mockFollowers);
      } catch (error) {
        console.error('Error fetching followers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFollowers();
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
  
  if (followers.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">No followers yet.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {followers.map((follower) => (
        <div 
          key={follower.id} 
          className="flex items-center p-4 bg-white border border-gray-200 rounded-lg"
        >
          <Link href={`/profile/${follower.id}`}>
            <div className="flex items-center flex-1">
              <div className="w-12 h-12 bg-navy-200 rounded-full flex items-center justify-center text-navy-700 font-bold">
                {follower.avatarPath ? (
                  <img 
                    src={follower.avatarPath} 
                    alt={`${follower.firstName} ${follower.lastName}`} 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <>
                    {follower.firstName.charAt(0)}{follower.lastName.charAt(0)}
                  </>
                )}
              </div>
              <div className="ml-4">
                <h3 className="font-medium">{follower.firstName} {follower.lastName}</h3>
                <p className="text-sm text-gray-500">@{follower.nickname}</p>
              </div>
            </div>
          </Link>
          
          <button 
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              follower.isFollowing
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-navy-600 text-white hover:bg-navy-700'
            }`}
          >
            {follower.isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      ))}
    </div>
  );
};

export default ProfileFollowers;