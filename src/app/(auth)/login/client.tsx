'use client';

import LoginForm from '@/features/auth/LoginForm';
import Link from 'next/link';

export default function LoginClient() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Sign in to your account
          </p>
        </div>
        
        <LoginForm />
        
        <p className="text-center text-sm">
          Don't have an account?{' '}
          <Link 
            href="/register" 
            className="text-primary hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}