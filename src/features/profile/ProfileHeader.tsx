import type { User } from '@/types/user';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ProfileHeaderProps {
  user: User;
  postCount: number;
}

export default function ProfileHeader({ user, postCount }: ProfileHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
      <div className="flex items-start gap-4">
        <img
          src={user.avatar || '/default-avatar.png'}
          alt={user.name}
          className="w-24 h-24 rounded-full object-cover"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
          
          {user.bio && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">{user.bio}</p>
          )}
          
          <div className="flex items-center gap-4 mt-4">
            <div>
              <span className="font-semibold">{postCount}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                {postCount === 1 ? 'Post' : 'Posts'}
              </span>
            </div>
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <Calendar size={16} className="mr-1" />
              <span>Joined {format(new Date(user.createdAt), 'MMMM yyyy')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}