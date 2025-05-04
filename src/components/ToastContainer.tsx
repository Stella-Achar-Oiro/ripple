'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Toast, { ToastType } from './Toast';
import { v4 as uuidv4 } from 'uuid';
import ClientOnlyPortal from './ClientOnlyPortal';

interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  // Use useEffect instead of useState for client-side initialization
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const showToast = useCallback((options: ToastOptions) => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, ...options }]);
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {isMounted && (
        <ClientOnlyPortal selector="ripple-toast-container">
          <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end">
            {toasts.map(toast => (
              <Toast
                key={toast.id}
                id={toast.id}
                type={toast.type}
                title={toast.title}
                message={toast.message}
                duration={toast.duration}
                onClose={removeToast}
              />
            ))}
          </div>
        </ClientOnlyPortal>
      )}
    </ToastContext.Provider>
  );
}