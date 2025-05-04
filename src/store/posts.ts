import { create } from 'zustand';
import { Post, PostState, CreatePostData } from '@/types/post';
import api from '@/lib/api';

interface PostStore extends PostState {
  nextCursor: string | null;
  fetchPosts: (username?: string) => Promise<void>;
  fetchMorePosts: () => Promise<void>;
  createPost: (data: CreatePostData) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  reset: () => void;
}

const usePostStore = create<PostStore>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,
  nextCursor: null,

  reset: () => {
    set({ posts: [], nextCursor: null, isLoading: false, error: null });
  },

  fetchPosts: async (username?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (username) params.append('username', username);
      
      const response = await api.get(`/posts?${params.toString()}`);
      set({ 
        posts: response.data.posts,
        nextCursor: response.data.nextCursor,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
        isLoading: false 
      });
    }
  },

  fetchMorePosts: async () => {
    const { nextCursor, isLoading } = get();
    if (!nextCursor || isLoading) return;

    set({ isLoading: true });
    try {
      const params = new URLSearchParams({ cursor: nextCursor });
      const response = await api.get(`/posts?${params.toString()}`);
      
      set(state => ({ 
        posts: [...state.posts, ...response.data.posts],
        nextCursor: response.data.nextCursor,
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch more posts',
        isLoading: false 
      });
    }
  },

  createPost: async (data: CreatePostData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/posts', data);
      set(state => ({ 
        posts: [response.data, ...state.posts],
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create post',
        isLoading: false 
      });
    }
  },

  likePost: async (postId: string) => {
    try {
      await api.post(`/posts/${postId}/like`);
      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId
            ? { ...post, likes: post.likes + 1 }
            : post
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to like post'
      });
    }
  },
}));

export default usePostStore;