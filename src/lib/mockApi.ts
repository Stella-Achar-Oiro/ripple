import { mockUsers, mockPosts, simulateDelay, simulateError } from '@/store/mockData';
import { User, LoginCredentials, RegisterData } from '@/types/user';
import { Post, CreatePostData } from '@/types/post';

// Mock API service for development
export const mockApi = {
  // Auth endpoints
  auth: {
    login: async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
      await simulateDelay();
      
      if (simulateError()) {
        throw new Error('Invalid email or password');
      }
      
      const user = mockUsers.find(u => u.email === credentials.email);
      
      if (!user || credentials.password !== 'password') {
        throw new Error('Invalid email or password');
      }
      
      return {
        user,
        token: 'mock-jwt-token'
      };
    },
    
    register: async (data: RegisterData): Promise<{ user: User; token: string }> => {
      await simulateDelay();
      
      if (simulateError()) {
        throw new Error('Registration failed');
      }
      
      // Check if email or username already exists
      if (mockUsers.some(u => u.email === data.email)) {
        throw new Error('Email already in use');
      }
      
      if (mockUsers.some(u => u.username === data.username)) {
        throw new Error('Username already taken');
      }
      
      // Create new user
      const newUser: User = {
        id: `${mockUsers.length + 1}`,
        username: data.username,
        email: data.email,
        name: data.name,
        avatar: '/default-avatar.png',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // In a real app we would add the user to the database
      // For mock purposes, we just return the new user
      return {
        user: newUser,
        token: 'mock-jwt-token'
      };
    },
    
    getCurrentUser: async (): Promise<User> => {
      await simulateDelay();
      
      if (simulateError()) {
        throw new Error('Failed to get current user');
      }
      
      // Return the first user as the current user
      return mockUsers[0];
    }
  },
  
  // Posts endpoints
  posts: {
    getAll: async (): Promise<Post[]> => {
      await simulateDelay();
      
      if (simulateError()) {
        throw new Error('Failed to fetch posts');
      }
      
      return [...mockPosts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    
    getById: async (id: string): Promise<Post> => {
      await simulateDelay();
      
      if (simulateError()) {
        throw new Error('Failed to fetch post');
      }
      
      const post = mockPosts.find(p => p.id === id);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      return post;
    },
    
    create: async (data: CreatePostData, userId: string): Promise<Post> => {
      await simulateDelay();
      
      if (simulateError()) {
        throw new Error('Failed to create post');
      }
      
      const author = mockUsers.find(u => u.id === userId);
      
      if (!author) {
        throw new Error('User not found');
      }
      
      const newPost: Post = {
        id: `${mockPosts.length + 1}`,
        content: data.content,
        author,
        likes: 0,
        comments: 0,
        image: data.image ? URL.createObjectURL(data.image) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // In a real app we would add the post to the database
      // For mock purposes, we just return the new post
      return newPost;
    },
    
    like: async (id: string): Promise<{ likes: number }> => {
      await simulateDelay();
      
      if (simulateError()) {
        throw new Error('Failed to like post');
      }
      
      const post = mockPosts.find(p => p.id === id);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Increment likes
      post.likes += 1;
      
      return { likes: post.likes };
    }
  },
  
  // Search endpoints
  search: {
    users: async (query: string): Promise<User[]> => {
      await simulateDelay();
      
      if (simulateError()) {
        throw new Error('Search failed');
      }
      
      if (!query) {
        return [];
      }
      
      const lowercaseQuery = query.toLowerCase();
      
      return mockUsers.filter(
        user => 
          user.username.toLowerCase().includes(lowercaseQuery) || 
          user.name.toLowerCase().includes(lowercaseQuery)
      );
    }
  }
};

export default mockApi;