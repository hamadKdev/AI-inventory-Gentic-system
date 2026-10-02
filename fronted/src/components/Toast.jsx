import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const styles = {
            success: {
              border: 'border-emerald-500/40',
              bg: 'bg-slate-900/95',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
              title: 'Success',
            },
            error: {
              border: 'border-rose-500/40',
              bg: 'bg-slate-900/95',
              icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
              title: 'Error',
            },
            warning: {
              border: 'border-amber-500/40',
              bg: 'bg-slate-900/95',
              icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              title: 'Notice',
            },
            info: {
              border: 'border-cyan-500/40',
              bg: 'bg-slate-900/95',
              icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
              title: 'Update',
            },
          }[item.type || 'info'];

          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${styles.border} ${styles.bg} backdrop-blur-xl shadow-2xl transition-all duration-150 animate-page-enter`}
            >
              {styles.icon}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300">{styles.title}</p>
                <p className="text-sm text-slate-100 mt-0.5 break-words leading-snug">
                  {item.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/70 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
