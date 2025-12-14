'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  show: boolean;
  duration?: number;
}

interface Particle {
  id: number;
  left: number;
  delay: number;
  animDuration: number;
  color: string;
  rotation: number;
}

const COLORS = [
  'bg-orange-500',
  'bg-amber-400',
  'bg-yellow-500',
  'bg-red-500',
];

/**
 * Confetti celebration effect (renders 50-60 particles)
 */
export function Confetti({ show, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Generate particles
      const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        animDuration: 2 + Math.random() * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
      }));
      
      setParticles(newParticles);
      setVisible(true);

      // Hide after duration
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti"
          style={{
            left: `${particle.left}%`,
            top: '-10%',
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.animDuration}s`,
          }}
        >
          <div
            className={`w-3 h-3 ${particle.color}`}
            style={{ transform: `rotate(${particle.rotation}deg)` }}
          />
        </div>
      ))}
    </div>
  );
}

export default Confetti;