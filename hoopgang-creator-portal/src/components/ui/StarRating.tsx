'use client';

import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  editable?: boolean;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function StarRating({ 
  rating, 
  editable = false, 
  onChange, 
  size = 'md' 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const handleClick = (newRating: number) => {
    if (editable && onChange) {
      onChange(newRating);
    }
  };

  const handleMouseEnter = (starRating: number) => {
    if (editable) {
      setHoverRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    if (editable) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating > 0 ? hoverRating : rating;

  return (
    <div className={`flex gap-1 ${sizeClasses[size]}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          onMouseLeave={handleMouseLeave}
          className={editable ? 'cursor-pointer transition-colors' : ''}
        >
          {star <= displayRating ? (
            <span className="text-yellow-400">★</span>
          ) : (
            <span className="text-white/20">★</span>
          )}
        </span>
      ))}
    </div>
  );
}

