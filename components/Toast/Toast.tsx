'use client';

import type { Toast as ToastType, ToastType as TType } from '@/lib/types';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const typeStyles: Record<TType, string> = {
  success: 'bg-green-50 border-green-500 text-green-800',
  error: 'bg-red-50 border-red-500 text-red-800',
  info: 'bg-blue-50 border-blue-500 text-blue-800',
};

const icons: Record<TType, React.ReactNode> = {
  success: (
    <svg
      className="w-5 h-5 text-green-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  error: (
    <svg
      className="w-5 h-5 text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  info: (
    <svg
      className="w-5 h-5 text-blue-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-lg border-l-4 shadow-lg
        animate-slide-in-right
        ${typeStyles[toast.type]}
      `}
      role="alert"
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="닫기"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
