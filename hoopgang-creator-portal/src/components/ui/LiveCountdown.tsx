'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface LiveCountdownProps {
  targetDate: Date;
  size?: 'sm' | 'md' | 'lg';
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Real-time countdown timer with days/hours/minutes/seconds
 */
export function LiveCountdown({ 
  targetDate, 
  size = 'sm', 
  onComplete 
}: LiveCountdownProps) {
  const calculateTimeLeft = useCallback((): TimeLeft => {
    const difference = targetDate.getTime() - Date.now();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      // Check if countdown completed
      if (
        !hasCompleted &&
        newTimeLeft.days === 0 &&
        newTimeLeft.hours === 0 &&
        newTimeLeft.minutes === 0 &&
        newTimeLeft.seconds === 0
      ) {
        setHasCompleted(true);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, hasCompleted, onComplete]);

  // Small inline variant
  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1 text-xs font-mono">
        <span className="text-orange-400">{timeLeft.days}d</span>
        <span className="text-orange-400">{timeLeft.hours}h</span>
        <span className="text-orange-400">{timeLeft.minutes}m</span>
        <span className="text-orange-400/60">
          {timeLeft.seconds.toString().padStart(2, '0')}s
        </span>
      </div>
    );
  }

  // Medium variant
  if (size === 'md') {
    return (
      <div className="flex items-center gap-2 font-mono">
        {timeLeft.days > 0 && (
          <>
            <span className="text-orange-400 font-bold">{timeLeft.days}d</span>
            <span className="text-zinc-600">:</span>
          </>
        )}
        <span className="text-orange-400 font-bold">{timeLeft.hours}h</span>
        <span className="text-zinc-600">:</span>
        <span className="text-orange-400 font-bold">{timeLeft.minutes}m</span>
        <span className="text-zinc-600">:</span>
        <span className="text-orange-400/70 font-bold">
          {timeLeft.seconds.toString().padStart(2, '0')}s
        </span>
      </div>
    );
  }

  // Large variant with boxes
  return (
    <div className="flex items-center justify-center gap-3">
      <TimeBox value={timeLeft.days} label="DAYS" />
      <span className="text-zinc-600 text-2xl font-bold">:</span>
      <TimeBox value={timeLeft.hours} label="HRS" />
      <span className="text-zinc-600 text-2xl font-bold">:</span>
      <TimeBox value={timeLeft.minutes} label="MIN" />
      <span className="text-zinc-600 text-2xl font-bold">:</span>
      <TimeBox value={timeLeft.seconds} label="SEC" dimmed />
    </div>
  );
}

function TimeBox({ 
  value, 
  label, 
  dimmed = false 
}: { 
  value: number; 
  label: string; 
  dimmed?: boolean;
}) {
  return (
    <div className="text-center">
      <div 
        className={cn(
          "bg-zinc-800 px-4 py-2 rounded-xl text-2xl font-bold min-w-[60px]",
          dimmed ? "text-orange-400/70" : "text-orange-400"
        )}
      >
        {value.toString().padStart(2, '0')}
      </div>
      <div className="text-zinc-500 text-xs mt-1">{label}</div>
    </div>
  );
}

export default LiveCountdown;