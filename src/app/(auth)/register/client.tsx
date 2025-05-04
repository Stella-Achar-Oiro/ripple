'use client';

import RegisterForm from '@/features/auth/RegisterForm';
import Link from 'next/link';

export default function RegisterClient() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Join Ripple and connect with others
          </p>
        </div>
        
        <RegisterForm />
        
        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link 
            href="/login" 
            className="text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}