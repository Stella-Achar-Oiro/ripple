import EnhancedPostCard from '@/components/EnhancedPostCard';
import CreatePostForm from '@/components/CreatePostForm';
import { mockPosts } from '@/store/mockData';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto">
      <CreatePostForm />
      
      <div className="mt-6 space-y-6">
        {mockPosts.map(post => (
          <EnhancedPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}