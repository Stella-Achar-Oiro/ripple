'use client';

import { create } from 'zustand';
import { Post, PostsState, CreatePostData } from '@/types/post';
import mockApi from '@/lib/mockApi';

interface PostsStore extends PostsState {
  fetchPosts: () => Promise<void>;
  createPost: (data: CreatePostData) => Promise<void>;
  likePost: (id: string) => Promise<void>;
}

const usePostsStore = create<PostsStore>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,
  
  fetchPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const posts = await mockApi.posts.getAll();
      set({ posts, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch posts', 
        isLoading: false 
      });
    }
  },
  
  createPost: async (data: CreatePostData) => {
    set({ isLoading: true, error: null });
    try {
      // In a real app, we would get the user ID from the auth store
      // For now, we'll use the first mock user
      const newPost = await mockApi.posts.create(data, '1');
      set(state => ({ 
        posts: [newPost, ...state.posts],
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create post', 
        isLoading: false 
      });
    }
  },
  
  likePost: async (id: string) => {
    try {
      const { likes } = await mockApi.posts.like(id);
      set(state => ({
        posts: state.posts.map(post => 
          post.id === id ? { ...post, likes } : post
        )
      }));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  }
}));

export default usePostsStore;