import { useCallback, useRef, useState } from 'react';

const DEFAULT_DURATION = 4000;

/**
 * Lightweight toast queue - replaces blocking alert() calls.
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message, { type = 'info', duration = DEFAULT_DURATION, action } = {}) => {
      if (!message) return null;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => [...prev.slice(-2), { id, message, type, action }]);

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }
      return id;
    },
    [dismiss]
  );

  return { toasts, notify, dismiss };
};
