'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Users, FileText, Image, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { mockUsers, mockPosts } from '@/store/mockData';
import Link from 'next/link';
import EnhancedPostCard from '@/components/EnhancedPostCard';

type SearchTab = 'people' | 'posts' | 'images';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('people');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState({
    people: [] as typeof mockUsers,
    posts: [] as typeof mockPosts,
    images: [] as typeof mockPosts,
  });
  
  // Filter results based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({
        people: [],
        posts: [],
        images: [],
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API delay
    const timer = setTimeout(() => {
      const query = searchQuery.toLowerCase();
      
      // Filter users
      const filteredUsers = mockUsers.filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.username.toLowerCase().includes(query) ||
        (user.bio && user.bio.toLowerCase().includes(query))
      );
      
      // Filter posts
      const filteredPosts = mockPosts.filter(post => 
        post.content.toLowerCase().includes(query) ||
        post.author.name.toLowerCase().includes(query) ||
        post.author.username.toLowerCase().includes(query)
      );
      
      // Filter posts with images
      const filteredImages = mockPosts.filter(post => 
        post.image && 
        (post.content.toLowerCase().includes(query) ||
        post.author.name.toLowerCase().includes(query) ||
        post.author.username.toLowerCase().includes(query))
      );
      
      setResults({
        people: filteredUsers,
        posts: filteredPosts,
        images: filteredImages,
      });
      
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const tabs = [
    { id: 'people', label: 'People', icon: <Users size={18} /> },
    { id: 'posts', label: 'Posts', icon: <FileText size={18} /> },
    { id: 'images', label: 'Images', icon: <Image size={18} /> },
  ] as const;
  
  const hasResults = 
    results.people.length > 0 || 
    results.posts.length > 0 || 
    results.images.length > 0;
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for people, posts, and more..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <SearchIcon className="absolute left-3 top-3.5 text-gray-500 dark:text-gray-400" size={20} />
          
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {searchQuery && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="mr-2">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full px-2 py-0.5">
                  {results[tab.id].length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Search results */}
      <div className="space-y-6">
        {searchQuery ? (
          isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-12 w-12 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2.5"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : hasResults ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'people' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                  {results.people.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.username}`}
                      className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center">
                        <Avatar 
                          src={user.avatar} 
                          alt={user.name} 
                          size="md"
                          className="mr-3"
                        />
                        
                        <div>
                          <h3 className="font-medium">{user.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                          {user.bio && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {activeTab === 'posts' && (
                <div className="space-y-4">
                  {results.posts.map((post) => (
                    <EnhancedPostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
              
              {activeTab === 'images' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {results.images.map((post) => (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        className="block aspect-square rounded-lg overflow-hidden relative group"
                      >
                        <img 
                          src={post.image} 
                          alt={`Post by ${post.author.name}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-end">
                          <div className="p-2 w-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-sm font-medium truncate">{post.author.name}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {results.images.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No images found matching your search
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No results found for "{searchQuery}"
              </p>
            </div>
          )
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Enter a search term to find people, posts, and more
            </p>
          </div>
        )}
      </div>
    </div>
  );
}