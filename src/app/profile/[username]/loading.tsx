import LoadingSpinner from '@/components/LoadingSpinner';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        </div>
        <div className="flex justify-center p-8">
          <LoadingSpinner size={32} />
        </div>
      </main>
    </div>
  );
}