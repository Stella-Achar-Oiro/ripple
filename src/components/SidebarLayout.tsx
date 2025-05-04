'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  User, 
  Bell, 
  MessageSquare, 
  Search as SearchIcon, 
  Settings, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import useAuthStore from '@/store/auth';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';
import NotificationBadge from './NotificationBadge';
import Search from './Search';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  
  // Close mobile menu when escape key is pressed
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);
  
  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);
  
  if (!user) return <>{children}</>;
  
  const navItems = [
    { href: '/', icon: <Home size={24} />, label: 'Home' },
    { href: `/profile/${user.username}`, icon: <User size={24} />, label: 'Profile' },
    { href: '/notifications', icon: <Bell size={24} />, label: 'Notifications', badge: 3 },
    { href: '/messages', icon: <MessageSquare size={24} />, label: 'Messages', badge: 5 },
    { href: '/search', icon: <SearchIcon size={24} />, label: 'Search', mobileOnly: true },
    { href: '/settings', icon: <Settings size={24} />, label: 'Settings' },
  ];
  
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };
  
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          Ripple
        </Link>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.filter(item => !item.mobileOnly).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center px-4 py-3 rounded-lg transition-colors relative
              ${isActive(item.href) 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
            `}
          >
            <span className="mr-3">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && (
              <NotificationBadge 
                count={item.badge} 
                size="sm" 
                className="ml-auto"
                variant={isActive(item.href) ? "primary" : "secondary"}
              />
            )}
            
            {isActive(item.href) && (
              <motion.div
                layoutId="sidebar-active-indicator"
                className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <Link
            href={`/profile/${user.username}`}
            className="flex items-center space-x-3"
          >
            <Avatar 
              src={user.avatar} 
              alt={user.name} 
              size="sm"
              status="online"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{user.username}
              </p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-error rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Log out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {sidebarContent}
      </aside>
      
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu size={24} />
          </button>
          
          <Link href="/" className="text-xl font-bold text-primary">
            Ripple
          </Link>
          
          <Link href={`/profile/${user.username}`}>
            <Avatar 
              src={user.avatar} 
              alt={user.name} 
              size="sm"
              status="online"
            />
          </Link>
        </div>
      </div>
      
      {/* Mobile sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-20"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-800 z-30 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <Link href="/" className="text-xl font-bold text-primary">
                  Ripple
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}