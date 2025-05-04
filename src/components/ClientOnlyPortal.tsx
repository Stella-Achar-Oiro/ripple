'use client';

import { useState, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ClientOnlyPortalProps {
  children: ReactNode;
  selector: string;
}

export default function ClientOnlyPortal({ children, selector }: ClientOnlyPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Create the element if it doesn't exist
    if (!document.getElementById(selector)) {
      const el = document.createElement('div');
      el.setAttribute('id', selector);
      document.body.appendChild(el);
    }
    
    return () => {
      // Optional cleanup - remove the element when component unmounts
      const el = document.getElementById(selector);
      if (el && el.childNodes.length === 0) {
        document.body.removeChild(el);
      }
    };
  }, [selector]);

  return mounted ? createPortal(children, document.getElementById(selector) || document.body) : null;
}