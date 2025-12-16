// src/components/ui/ConfirmModal.tsx
'use client';

import { ReactNode } from 'react';

type ConfirmColor = 'green' | 'red' | 'orange' | 'blue';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: ConfirmColor;
  isProcessing?: boolean;
  children?: ReactNode;
  icon?: string;
}

const confirmColorMap: Record<ConfirmColor, string> = {
  green: 'bg-green-500 hover:bg-green-600',
  red: 'bg-red-500 hover:bg-red-600',
  orange: 'bg-orange-500 hover:bg-orange-600',
  blue: 'bg-blue-500 hover:bg-blue-600',
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'orange',
  isProcessing = false,
  children,
  icon
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-6">
          {icon && <div className="text-5xl mb-4">{icon}</div>}
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-zinc-400">{message}</p>
        </div>

        {/* Custom content slot */}
        {children && (
          <div className="mb-6">
            {children}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`
              flex-1 py-3 text-white rounded-xl font-medium transition-colors 
              disabled:opacity-50 flex items-center justify-center gap-2
              ${confirmColorMap[confirmColor]}
            `}
          >
            {isProcessing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;