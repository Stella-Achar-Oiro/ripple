'use client';

import { create } from 'zustand';
import { AuthState, LoginCredentials, RegisterData, User } from '@/types/user';
import Cookies from 'js-cookie';
import mockApi from '@/lib/mockApi';

const useAuthStore = create<AuthState & {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  initializeUser: () => Promise<void>;
}>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user }),
  
  initializeUser: async () => {
    // Check if we have a token
    const token = Cookies.get('token');
    if (!token) return;
    
    set({ isLoading: true });
    try {
      // In a real app, we would validate the token with the backend
      // For now, we'll just fetch the mock current user
      const user = await mockApi.auth.getCurrentUser();
      set({ user, isLoading: false });
    } catch (error) {
      // If token validation fails, clear it
      Cookies.remove('token');
      set({ isLoading: false });
    }
  },
  
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      // Use mock API instead of real backend
      const { user, token } = await mockApi.auth.login(credentials);
      Cookies.set('token', token);
      set({ user, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Login failed', 
        isLoading: false 
      });
    }
  },
  
  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      // Use mock API instead of real backend
      const { user, token } = await mockApi.auth.register(data);
      Cookies.set('token', token);
      set({ user, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Registration failed', 
        isLoading: false 
      });
    }
  },
  
  logout: () => {
    Cookies.remove('token');
    set({ user: null });
  },
}));

export default useAuthStore;