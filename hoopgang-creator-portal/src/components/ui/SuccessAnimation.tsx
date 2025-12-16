// src/components/ui/SuccessAnimation.tsx
'use client';

import { useEffect } from 'react';

interface SuccessAnimationProps {
  message: string;
  icon: string;
  onComplete: () => void;
  duration?: number;
}

export function SuccessAnimation({ 
  message, 
  icon, 
  onComplete, 
  duration = 2000 
}: SuccessAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="text-center animate-fade-in-up">
        <div className="text-7xl mb-4 animate-bounce-subtle">{icon}</div>
        <div className="text-2xl font-bold text-white">{message}</div>
      </div>
    </div>
  );
}

export default SuccessAnimation;