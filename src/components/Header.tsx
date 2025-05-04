import Link from 'next/link';
import { Home, User, LogOut } from 'lucide-react';
import useAuthStore from '@/store/auth';
import Search from './Search';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-bold text-primary shrink-0">
          Ripple
        </Link>

        <div className="w-full max-w-md">
          <Search />
        </div>

        <nav className="flex items-center space-x-4 shrink-0">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <Home size={24} />
          </Link>
          <Link
            href={`/profile/${user.username}`}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <User size={24} />
          </Link>
          <ThemeToggle />
          <button
            onClick={logout}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-error"
          >
            <LogOut size={24} />
          </button>
        </nav>
      </div>
    </header>
  );
}