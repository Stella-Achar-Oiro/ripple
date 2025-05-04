'use client';

import { motion } from 'framer-motion';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
  pulse?: boolean;
}

export default function NotificationBadge({
  count,
  maxCount = 99,
  size = 'md',
  variant = 'primary',
  pulse = false
}: NotificationBadgeProps) {
  if (count <= 0) return null;
  
  // Size classes
  const sizeClasses = {
    sm: 'min-w-4 h-4 text-xs px-1',
    md: 'min-w-5 h-5 text-xs px-1.5',
    lg: 'min-w-6 h-6 text-sm px-2',
  };
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-white',
    error: 'bg-error text-white',
    warning: 'bg-warning text-white',
    success: 'bg-success text-white',
  };
  
  // Format the count
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center justify-center rounded-full font-medium
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${pulse ? 'animate-pulse' : ''}
      `}
    >
      {displayCount}
      
      {pulse && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-75 animate-ping" />
      )}
    </motion.div>
  );
}