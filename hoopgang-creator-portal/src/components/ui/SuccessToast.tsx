'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SuccessToastProps {
  show: boolean;
  message: string;
  subMessage?: string;
  onClose: () => void;
  duration?: number;
}

/**
 * Success notification toast with slide-down animation
 */
export function SuccessToast({ 
  show, 
  message, 
  subMessage, 
  onClose,
  duration = 4000,
}: SuccessToastProps) {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-down">
      <div 
        className={cn(
          "bg-zinc-900 border border-green-500/30 rounded-xl p-4",
          "shadow-lg shadow-green-500/10",
          "flex items-start gap-3 min-w-[300px] max-w-[400px]"
        )}
      >
        {/* Success icon */}
        <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
          <svg 
            className="w-5 h-5 text-green-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium">{message}</p>
          {subMessage && (
            <p className="text-zinc-400 text-sm mt-0.5">{subMessage}</p>
          )}
        </div>
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="flex-shrink-0 text-zinc-500 hover:text-white transition-colors"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SuccessToast;