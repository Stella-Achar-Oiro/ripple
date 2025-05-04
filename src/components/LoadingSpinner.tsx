import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export default function LoadingSpinner({ size = 24, className = '' }: LoadingSpinnerProps) {
  return (
    <div className="flex justify-center items-center">
      <Loader2 size={size} className={`animate-spin ${className}`} />
    </div>
  );
}