'use client';

import { useMemo } from 'react';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

export default function Avatar({ 
  src, 
  alt, 
  size = 'md', 
  className = '',
  status
}: AvatarProps) {
  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  // Status indicator classes
  const statusClasses = {
    online: 'bg-success',
    offline: 'bg-gray-400',
    away: 'bg-warning',
    busy: 'bg-error'
  };

  // Generate initials from name
  const initials = useMemo(() => {
    if (!alt) return '';
    
    const nameParts = alt.split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  }, [alt]);

  // Generate a consistent background color based on the name
  const avatarColor = useMemo(() => {
    if (!alt) return 'bg-primary';
    
    // Simple hash function to generate a consistent color
    const hash = alt.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Use the hash to select from a set of predefined colors
    const colors = [
      'bg-primary/80',
      'bg-secondary/80',
      'bg-primary/60',
      'bg-secondary/60',
      'bg-primary/40',
      'bg-secondary/40',
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }, [alt]);

  return (
    <div className={`relative ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white dark:border-gray-800`}
        />
      ) : (
        <div 
          className={`${sizeClasses[size]} ${avatarColor} rounded-full flex items-center justify-center text-white font-medium`}
          aria-label={alt}
        >
          {initials}
        </div>
      )}
      
      {status && (
        <span 
          className={`absolute bottom-0 right-0 block rounded-full ${statusClasses[status]} ring-2 ring-white dark:ring-gray-800`}
          style={{
            width: size === 'xs' ? '0.5rem' : size === 'sm' ? '0.625rem' : '0.75rem',
            height: size === 'xs' ? '0.5rem' : size === 'sm' ? '0.625rem' : '0.75rem'
          }}
        />
      )}
    </div>
  );
}