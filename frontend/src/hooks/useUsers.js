// src/hooks/useUsers.js
import { useState, useCallback } from 'react';
import { initialUsers } from '../data/mockData';

export const useUsers = () => {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const followUser = useCallback((userId) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              isFollowing: !user.isFollowing,
              followers: user.isFollowing ? user.followers - 1 : user.followers + 1
            }
          : user
      )
    );
  }, []);

  const searchUsers = useCallback((query) => {
    if (!query.trim()) return users;
    return users.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [users]);

  const getUserById = useCallback((userId) => {
    return users.find(user => user.id === userId);
  }, [users]);

  const getFollowing = useCallback(() => {
    return users.filter(user => user.isFollowing);
  }, [users]);

  const getSuggested = useCallback(() => {
    return users.filter(user => !user.isFollowing).slice(0, 5);
  }, [users]);

  return {
    users,
    loading,
    error,
    followUser,
    searchUsers,
    getUserById,
    getFollowing,
    getSuggested
  };
};