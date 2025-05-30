// src/hooks/useSearch.js
import { useState, useCallback, useMemo } from 'react';

export const useSearch = (data = [], searchFields = ['name']) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});

  const results = useMemo(() => {
    let filtered = data;

    // Apply text search
    if (query.trim()) {
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(query.toLowerCase());
        })
      );
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        filtered = filtered.filter(item => {
          if (Array.isArray(value)) {
            return value.includes(item[key]);
          }
          return item[key] === value;
        });
      }
    });

    return filtered;
  }, [data, query, filters, searchFields]);

  const updateQuery = useCallback((newQuery) => {
    setQuery(newQuery);
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setQuery('');
  }, []);

  const removeFilter = useCallback((key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  return {
    query,
    filters,
    results,
    updateQuery,
    updateFilter,
    clearFilters,
    removeFilter,
    hasActiveFilters: query.trim() || Object.keys(filters).length > 0
  };
};