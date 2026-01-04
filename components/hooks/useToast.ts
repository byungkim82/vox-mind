'use client';

import { useState, useCallback } from 'react';
import type { Toast, ToastType } from '@/lib/types';
import { TOAST_DEFAULT_DURATION_MS } from '@/lib/constants/ui';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = TOAST_DEFAULT_DURATION_MS) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return { toasts, addToast, removeToast };
}
