'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Link as LinkIcon, Edit, Plus } from 'lucide-react';
import { format } from 'date-fns';
import Avatar from './Avatar';
import Button from './Button';
import { User } from '@/types/user';

interface ProfileHeaderProps {
  user: User;
  isCurrentUser?: boolean;
}

export default function ProfileHeader({ user, isCurrentUser = false }: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  
  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };
  
  // Mock stats
  const stats = {
    posts: 42,
    followers: 1024,
    following: 256
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Cover image */}
      <div className="h-48 bg-gradient-to-r from-primary/30 to-secondary/30 relative">
        {isCurrentUser && (
          <button className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Edit size={18} />
          </button>
        )}
      </div>
      
      {/* Profile info */}
      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end -mt-12 sm:-mt-16">
          <Avatar 
            src={user.avatar} 
            alt={user.name} 
            size="xl"
            className="ring-4 ring-white dark:ring-gray-800"
          />
          
          <div className="mt-4 sm:mt-0 sm:ml-4 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
              </div>
              
              <div className="mt-4 sm:mt-0">
                {isCurrentUser ? (
                  <Button 
                    variant="outline" 
                    leftIcon={<Edit size={16} />}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button 
                      variant={isFollowing ? "outline" : "primary"}
                      onClick={toggleFollow}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button variant="outline">Message</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bio */}
        <div className="mt-6">
          <p className="text-gray-800 dark:text-gray-200">
            {user.bio || 'No bio yet.'}
          </p>
          
          <div className="mt-4 flex flex-wrap gap-y-2">
            <div className="flex items-center text-gray-500 dark:text-gray-400 mr-6">
              <MapPin size={16} className="mr-1" />
              <span>San Francisco, CA</span>
            </div>
            <div className="flex items-center text-gray-500 dark:text-gray-400 mr-6">
              <LinkIcon size={16} className="mr-1" />
              <a href="#" className="text-primary hover:underline">example.com</a>
            </div>
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <Calendar size={16} className="mr-1" />
              <span>Joined {format(new Date(user.createdAt), 'MMMM yyyy')}</span>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-6 flex border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold">{stats.posts}</p>
            <p className="text-gray-500 dark:text-gray-400">Posts</p>
          </div>
          <div className="flex-1 text-center border-l border-r border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold">{stats.followers}</p>
            <p className="text-gray-500 dark:text-gray-400">Followers</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold">{stats.following}</p>
            <p className="text-gray-500 dark:text-gray-400">Following</p>
          </div>
        </div>
      </div>
    </div>
  );
}