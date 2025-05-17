// frontend/src/components/layout/MobileNav.js
import { useRouter } from 'next/router';
import Link from 'next/link';

const MobileNav = () => {
  const router = useRouter();
  
  const isActive = (path) => router.pathname === path;
  
  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/profile', label: 'Profile', icon: '👤' },
    { path: '/groups', label: 'Groups', icon: '👥' },
    { path: '/chat', label: 'Chat', icon: '💬' },
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2">
      <div className="grid grid-cols-4">
        {navItems.map((item) => (
          <Link 
            href={item.path} 
            key={item.path}
          >
            <div
              className={`flex flex-col items-center p-2 ${
                isActive(item.path) ? 'text-navy-600' : 'text-gray-500'
              }`}
            >
              <div className="text-xl">{item.icon}</div>
              <div className="text-xs mt-1">{item.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;