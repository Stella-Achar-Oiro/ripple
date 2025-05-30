// src/hooks/useGroups.js
import { useState, useCallback } from 'react';
import { initialGroups } from '../data/mockData';

export const useGroups = () => {
  const [groups, setGroups] = useState(initialGroups);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const joinGroup = useCallback((groupId) => {
    setGroups(prevGroups => 
      prevGroups.map(group => 
        group.id === groupId 
          ? { 
              ...group, 
              joined: !group.joined,
              members: group.joined ? group.members - 1 : group.members + 1
            }
          : group
      )
    );
  }, []);

  const createGroup = useCallback((groupData) => {
    try {
      setLoading(true);
      const newGroup = {
        id: Date.now(),
        ...groupData,
        members: 1,
        joined: true
      };
      setGroups(prevGroups => [newGroup, ...prevGroups]);
      setError(null);
      return { success: true };
    } catch (err) {
      setError('Failed to create group');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const searchGroups = useCallback((query) => {
    if (!query.trim()) return groups;
    return groups.filter(group => 
      group.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [groups]);

  const getJoinedGroups = useCallback(() => {
    return groups.filter(group => group.joined);
  }, [groups]);

  const getSuggestedGroups = useCallback(() => {
    return groups.filter(group => !group.joined).slice(0, 5);
  }, [groups]);

  return {
    groups,
    loading,
    error,
    joinGroup,
    createGroup,
    searchGroups,
    getJoinedGroups,
    getSuggestedGroups
  };
};