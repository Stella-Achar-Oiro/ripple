// src/context/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Mock login - replace with actual API call
      if (email === 'user@example.com' && password === 'password') {
        const userData = {
          id: 1,
          name: 'John Doe',
          email: email,
          avatar: '👤',
          followers: 123,
          following: 89,
          bio: 'Living life to the fullest! 🌟',
          location: 'San Francisco, CA',
          joinedDate: 'Joined March 2020'
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        router.push('/');
        return { success: true };
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const signup = async (name, email, password) => {
    try {
      // Mock signup - replace with actual API call
      const userData = {
        id: Date.now(),
        name: name,
        email: email,
        avatar: '👤',
        followers: 0,
        following: 0,
        bio: 'New to the platform!',
        location: '',
        joinedDate: `Joined ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      router.push('/');
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Signup failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login');
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};