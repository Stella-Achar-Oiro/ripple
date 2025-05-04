import { create } from 'zustand';
import { AuthState, LoginCredentials, RegisterData, User } from '@/types/user';
import axios from 'axios';
import Cookies from 'js-cookie';

const useAuthStore = create<AuthState & {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user }),
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/auth/login', credentials);
      const { user, token } = response.data;
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
      const response = await axios.post('/api/auth/register', data);
      const { user, token } = response.data;
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