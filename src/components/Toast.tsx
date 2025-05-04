'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (duration === Infinity) return;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Allow animation to complete
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, id, onClose]);
  
  // Icon based on type
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-error" />,
    info: <Info className="h-5 w-5 text-primary" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />
  };
  
  // Border color based on type
  const borderColors = {
    success: 'border-l-success',
    error: 'border-l-error',
    info: 'border-l-primary',
    warning: 'border-l-warning'
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`
            bg-white dark:bg-gray-800 rounded-md shadow-lg 
            border-l-4 ${borderColors[type]}
            flex items-start p-4 w-full max-w-sm
          `}
        >
          <div className="flex-shrink-0 mr-3">
            {icons[type]}
          </div>
          
          <div className="flex-1 mr-2">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {title}
            </h4>
            {message && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {message}
              </p>
            )}
          </div>
          
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(id), 300);
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}