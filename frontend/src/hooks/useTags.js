// src/hooks/useTags.js
import { useState, useCallback, useMemo } from 'react';
import { trendingTags } from '../data/mockData';

export const useTags = (posts = []) => {
  const [selectedTags, setSelectedTags] = useState([]);

  const addTag = useCallback((tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
  }, [selectedTags]);

  const removeTag = useCallback((tag) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  }, []);

  const toggleTag = useCallback((tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const clearTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  // Calculate trending tags from posts
  const trendingFromPosts = useMemo(() => {
    const tagCounts = {};
    posts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, posts: count }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 10);
  }, [posts]);

  const getFilteredPosts = useCallback((postsToFilter, filterTags = selectedTags) => {
    if (filterTags.length === 0) return postsToFilter;
    
    return postsToFilter.filter(post => 
      post.tags && filterTags.some(tag => post.tags.includes(tag))
    );
  }, [selectedTags]);

  const getPopularTags = useCallback(() => {
    return trendingFromPosts.length > 0 ? trendingFromPosts : trendingTags;
  }, [trendingFromPosts]);

  const searchTags = useCallback((query) => {
    const allTags = getPopularTags().map(t => t.tag);
    return allTags.filter(tag => 
      tag.toLowerCase().includes(query.toLowerCase())
    );
  }, [getPopularTags]);

  return {
    selectedTags,
    addTag,
    removeTag,
    toggleTag,
    clearTags,
    getFilteredPosts,
    getPopularTags,
    searchTags,
    trendingTags: trendingFromPosts
  };
};
