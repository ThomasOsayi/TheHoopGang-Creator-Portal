'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast Container Component
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Individual Toast Component
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const typeStyles: Record<ToastType, { bg: string; icon: string; border: string }> = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      icon: '✓',
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: '✕',
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: '⚠',
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      icon: 'ℹ',
    },
  };

  const style = typeStyles[toast.type];

  return (
    <div
      className={`${style.bg} ${style.border} border backdrop-blur-xl rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 min-w-[280px] max-w-[400px] animate-slide-in`}
    >
      <span className="text-lg">{style.icon}</span>
      <p className="text-white text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white/50 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

