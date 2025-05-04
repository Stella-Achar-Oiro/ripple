'use client';

import { useEffect } from 'react';
import Button from '@/components/Button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We're sorry, but something went wrong. Please try again or contact support if the problem persists.
        </p>
        
        {error.digest && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="flex justify-center">
          <Button onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}