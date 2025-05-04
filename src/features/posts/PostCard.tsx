import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle } from 'lucide-react';
import usePostStore from '@/store/posts';
import type { Post } from '@/types/post';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const { likePost } = usePostStore();

  return (
    <div className="card bg-white dark:bg-gray-800 p-4 mb-4">
      <div className="flex items-center mb-4">
        <img
          src={post.author.avatar || '/default-avatar.png'}
          alt={post.author.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="ml-3">
          <h3 className="font-semibold">{post.author.name}</h3>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      <p className="mb-4 whitespace-pre-wrap">{post.content}</p>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Post attachment"
          className="rounded-lg mb-4 max-h-96 w-full object-cover"
        />
      )}

      <div className="flex items-center space-x-4">
        <button
          onClick={() => likePost(post.id)}
          className="flex items-center space-x-1 text-gray-500 hover:text-primary"
        >
          <Heart size={20} className={post.likes > 0 ? 'fill-primary text-primary' : ''} />
          <span>{post.likes}</span>
        </button>

        <button className="flex items-center space-x-1 text-gray-500 hover:text-primary">
          <MessageCircle size={20} />
          <span>{post.comments}</span>
        </button>
      </div>
    </div>
  );
}