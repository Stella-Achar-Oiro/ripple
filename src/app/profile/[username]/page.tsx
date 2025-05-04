import ProfileHeader from '@/features/profile/ProfileHeader';
import PostList from '@/features/posts/PostList';

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = params;

  // TODO: Fetch actual user data
  const mockUser = {
    id: '1',
    username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    email: `${username}@example.com`,
    bio: `This is ${username}'s profile`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <ProfileHeader user={mockUser} postCount={5} />
        <PostList username={username} />
      </main>
    </div>
  );
}