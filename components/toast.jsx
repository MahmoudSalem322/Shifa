'use client';

import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

/* Replaces the legacy Shifa.ui.toast() — same markup and CSS classes. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, tone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, tone, leaving: false }]);
    setTimeout(() => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 400);
    }, 3600);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="shifa-toast-host" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={'shifa-toast' + (t.leaving ? ' shifa-toast--out' : '')}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
