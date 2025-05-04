import Link from 'next/link';
import Button from '@/components/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We couldn't find the page you were looking for. It might have been removed, renamed, or doesn't exist.
        </p>
        
        <div className="flex justify-center">
          <Link href="/">
            <Button>
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}