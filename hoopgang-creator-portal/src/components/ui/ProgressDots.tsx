interface ProgressDotsProps {
  completed: number;
  total?: number;
  size?: 'sm' | 'md';
}

export default function ProgressDots({ completed, total = 1, size = 'md' }: ProgressDotsProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-medium text-white/80 mr-2">
        {completed}/{total}
      </span>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`${dotSize} rounded-full ${
            index < completed ? 'bg-orange-500' : 'bg-white/20'
          }`}
        />
      ))}
    </div>
  );
}

