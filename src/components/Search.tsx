"use client";
import { useState, useCallback } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import api from '@/lib/api';
import type { User } from '@/types/user';

export default function Search() {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const searchUsers = useCallback(
    debounce(async (query: string) => {
      if (!query) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get(`/search/users?q=${query}`);
        setResults(response.data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  return (
    <div className="relative">
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
        <SearchIcon size={20} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search users..."
          className="bg-transparent border-none focus:ring-0 focus:outline-none ml-2 w-full"
          onChange={(e) => {
            setIsOpen(true);
            searchUsers(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-80 overflow-auto">
                {results.map((user) => (
                  <button
                    key={user.id}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    onClick={() => {
                      router.push(`/profile/${user.username}`);
                      setIsOpen(false);
                    }}
                  >
                    <img
                      src={user.avatar || '/default-avatar.png'}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No users found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}