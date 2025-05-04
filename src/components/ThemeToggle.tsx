'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import useThemeStore from '@/store/theme';

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
      title={`Current theme: ${theme}`}
    >
      {theme === 'light' && <Sun size={24} />}
      {theme === 'dark' && <Moon size={24} />}
      {theme === 'system' && <Monitor size={24} />}
    </button>
  );
}