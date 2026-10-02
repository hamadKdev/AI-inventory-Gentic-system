import React from 'react';
import { X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  variant = 'primary',
}) {
  if (!isOpen) return null;

  const confirmButtonStyle =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-page-enter"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {description && (
            <p className="text-sm text-slate-300 leading-relaxed mb-4">{description}</p>
          )}
          {children}
        </div>

        {onConfirm && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950/50 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors whitespace-nowrap"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap disabled:opacity-50 ${confirmButtonStyle}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
