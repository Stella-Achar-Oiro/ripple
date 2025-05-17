import { useRouter } from 'next/router';
import Link from 'next/link';

const Sidebar = () => {
  const router = useRouter();
  
  const isActive = (path) => router.pathname === path;
  
  const navItems = [
    { path: '/', label: 'Home', icon: 'HomeIcon' },
    { path: '/profile', label: 'Profile', icon: 'UserIcon' },
    { path: '/groups', label: 'Groups', icon: 'UsersIcon' },
    { path: '/chat', label: 'Chat', icon: 'ChatIcon' },
  ];
  
  return (
    <div className="w-64 border-r border-gray-200 p-4 h-screen">
      <div className="text-xl font-bold text-navy-600 mb-8">Ripple</div>
      <div className="space-y-4">
        {navItems.map((item) => (
          <Link href={item.path} key={item.path}>
            <div
              className={`flex items-center gap-2 cursor-pointer ${
                isActive(item.path) ? 'text-navy-600' : 'text-gray-500'
              }`}
            >
              <div
                className={`w-4 h-4 rounded ${
                  isActive(item.path) ? 'bg-navy-600' : 'bg-gray-400'
                }`}
              ></div>
              <div>{item.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
