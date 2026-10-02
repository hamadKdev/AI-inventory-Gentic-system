import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({
  title = 'Unable to load data',
  message = 'Something went wrong. Please try again.',
  onRetry = null,
  compact = false,
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-950/35 border border-rose-500/30 text-rose-200 text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="truncate">{message}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-slate-900/80 border border-rose-500/30 text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{title}</h3>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
