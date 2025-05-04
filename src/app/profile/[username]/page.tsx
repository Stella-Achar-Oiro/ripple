import { mockUsers, mockPosts } from '@/store/mockData';
import ProfileHeader from '@/components/ProfileHeader';
import EnhancedPostCard from '@/components/EnhancedPostCard';
import { notFound } from 'next/navigation';

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  // Find user by username
  const user = mockUsers.find(u => u.username === params.username);
  
  // If user not found, show 404
  if (!user) {
    notFound();
  }
  
  // Get user's posts
  const userPosts = mockPosts.filter(post => post.author.id === user.id);
  
  // Check if this is the current user's profile (for demo purposes)
  const isCurrentUser = user.id === '1'; // Assuming user with ID 1 is the current user
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ProfileHeader user={user} isCurrentUser={isCurrentUser} />
      
      <div className="space-y-6">
        {userPosts.length > 0 ? (
          userPosts.map(post => (
            <EnhancedPostCard key={post.id} post={post} />
          ))
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-xl font-medium mb-2">No posts yet</h2>
            <p className="text-gray-500 dark:text-gray-400">
              {isCurrentUser 
                ? "You haven't posted anything yet. Share your first post!"
                : `${user.name} hasn't posted anything yet.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}