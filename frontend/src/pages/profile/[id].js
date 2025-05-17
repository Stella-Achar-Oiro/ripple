// frontend/src/pages/profile/[id].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileTabs from '../../components/profile/ProfileTabs';
import ProfilePosts from '../../components/profile/ProfilePosts';
import ProfileFollowers from '../../components/profile/ProfileFollowers';
import ProfileFollowing from '../../components/profile/ProfileFollowing';
import ProfileEditModal from '../../components/profile/ProfileEditModal';
import AboutSection from '../../components/profile/AboutSection';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState(null); // null, 'pending', 'accepted'
  const [hasAccess, setHasAccess] = useState(false);
  const { id } = router.query;
  
  useEffect(() => {
    // If we're not on the client side yet or id isn't available, do nothing
    if (!id) return;
    
    const fetchProfile = async () => {
      setIsLoading(true);
      
      try {
        // For development, we'll simulate API response
        // In a real app, we'd fetch the profile from the backend
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if this is the current user's profile
        const isCurrentUser = user && (id === user.id || id === 'me');
        
        if (isCurrentUser) {
          // If viewing own profile, use the authenticated user's data
          setProfileUser({
            ...user,
            followers: 42,
            following: 87,
            isCurrentUser: true,
          });
          setHasAccess(true);
        } else {
          // Simulate fetching another user's profile
          const mockUser = {
            id: id,
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane.doe@example.com',
            nickname: 'janedoe',
            aboutMe: 'Product designer and photography enthusiast. Love to travel and explore new places.',
            avatarPath: null,
            isPublic: id === '2', // Simulate a public profile for id '2', private for others
            coverPhotoPath: null,
            followers: 128,
            following: 95,
            isCurrentUser: false,
          };
          
          setProfileUser(mockUser);
          
          // Simulate follow status
          const randomStatus = Math.random();
          if (randomStatus < 0.3) {
            setFollowStatus('accepted');
            setIsFollowing(true);
            setHasAccess(true);
          } else if (randomStatus < 0.6) {
            setFollowStatus('pending');
            setIsFollowing(false);
            setHasAccess(false);
          } else {
            setFollowStatus(null);
            setIsFollowing(false);
            setHasAccess(mockUser.isPublic);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [id, user]);
  
  const handleFollow = async () => {
    if (isFollowing) {
      // Unfollow logic
      setIsFollowing(false);
      setFollowStatus(null);
      // In a real app, we'd call the API to unfollow
    } else {
      // Follow logic
      if (profileUser.isPublic) {
        setIsFollowing(true);
        setFollowStatus('accepted');
        setHasAccess(true);
      } else {
        setFollowStatus('pending');
      }
      // In a real app, we'd call the API to follow/send request
    }
  };
  
  const handleTogglePublic = async () => {
    // In a real app, we'd call the API to update the profile
    setProfileUser(prev => ({
      ...prev,
      isPublic: !prev.isPublic
    }));
  };
  
  const handleSaveProfile = async (updatedProfile) => {
    // In a real app, we'd call the API to update the profile
    setProfileUser(prev => ({
      ...prev,
      ...updatedProfile
    }));
    setIsEditing(false);
  };
  
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
        <div className="h-48 bg-gray-200 rounded-lg animate-pulse mb-4"></div>
        <div className="flex">
          <div className="w-32 h-32 bg-gray-300 rounded-full border-4 border-white -mt-16 ml-8 animate-pulse"></div>
          <div className="flex-1 ml-4 mt-2">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!profileUser) {
    return (
      <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-navy-800 mb-4">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">The profile you're looking for doesn't exist or you don't have permission to view it.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-navy-600 text-white rounded-md hover:bg-navy-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
      <ProfileHeader 
        user={profileUser}
        isCurrentUser={profileUser.isCurrentUser}
        isFollowing={isFollowing}
        followStatus={followStatus}
        onEditProfile={() => setIsEditing(true)}
        onFollow={handleFollow}
        onTogglePublic={handleTogglePublic}
      />
      
      {!hasAccess && !profileUser.isCurrentUser ? (
        <div className="bg-white p-8 rounded-lg shadow text-center mt-6">
          <h2 className="text-xl font-bold text-navy-800 mb-4">Private Profile</h2>
          <p className="text-gray-600 mb-4">
            {followStatus === 'pending' 
              ? "You've sent a follow request to this user. Once accepted, you'll be able to see their profile."
              : "This profile is private. Follow this user to see their posts and profile information."}
          </p>
          {followStatus !== 'pending' && (
            <button 
              onClick={handleFollow}
              className="px-4 py-2 bg-navy-600 text-white rounded-md hover:bg-navy-700"
            >
              Follow
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex mt-6">
            <div className="flex-1">
              <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
              
              <div className="mt-6">
                {activeTab === 'posts' && <ProfilePosts userId={profileUser.id} />}
                {activeTab === 'followers' && <ProfileFollowers userId={profileUser.id} />}
                {activeTab === 'following' && <ProfileFollowing userId={profileUser.id} />}
              </div>
            </div>
            
            <div className="hidden md:block w-72 ml-6">
              <AboutSection user={profileUser} />
            </div>
          </div>
        </>
      )}
      
      {isEditing && (
        <ProfileEditModal 
          user={profileUser}
          onSave={handleSaveProfile}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}

// Create a default profile page at /profile that redirects to the current user's profile
export function ProfileIndex() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      router.replace(`/profile/${user.id}`);
    } else if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [user, isAuthenticated, loading, router]);
  
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-navy-600"></div>
    </div>
  );
}

// frontend/src/pages/profile/index.js
export default ProfileIndex;