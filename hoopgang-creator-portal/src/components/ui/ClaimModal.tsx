// src/components/ui/ClaimModal.tsx
'use client';

import { useState } from 'react';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: {
    id: string;
    title: string;
    subtitle: string;
    value: string;
    icon: string;
    categoryColor?: 'gold' | 'purple' | 'blue' | 'green';
  } | null;
  onSubmit: (tiktokUrl: string) => Promise<void>;
}

export function ClaimModal({ isOpen, onClose, reward, onSubmit }: ClaimModalProps) {
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categoryColors = {
    gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  };

  const colors = categoryColors[reward?.categoryColor || 'purple'];

  if (!isOpen || !reward) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic URL validation
    if (!tiktokUrl.trim()) {
      setError('Please enter a TikTok URL');
      return;
    }

    if (!tiktokUrl.includes('tiktok.com')) {
      setError('Please enter a valid TikTok URL');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(tiktokUrl.trim());
      setTiktokUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Reward Info */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{reward.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-1">{reward.title}</h2>
          <p className="text-zinc-400 text-sm mb-2">{reward.subtitle}</p>
          <div className={`inline-block px-4 py-2 ${colors.bg} ${colors.text} ${colors.border} border rounded-xl font-bold text-sm`}>
            {reward.value}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              TikTok URL
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a4.85 4.85 0 0 0 3.77 4.25v3.44h3.45v-3.44a4.85 4.85 0 0 0 3.77-4.25z"/>
                </svg>
              </div>
              <input
                type="text"
                value={tiktokUrl}
                onChange={(e) => {
                  setTiktokUrl(e.target.value);
                  setError('');
                }}
                placeholder="https://www.tiktok.com/@username/video/..."
                className="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-zinc-400 hover:text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

