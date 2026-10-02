import React from 'react';
import { Loader2 } from 'lucide-react';

export function FullPageLoader({ message = 'Verifying session with inventory server...' }) {
  return (
    <div className="min-h-screen bg-[#090D1A] flex flex-col items-center justify-center p-6 text-slate-200">
      <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 mb-4">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-300">{message}</p>
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="p-5 rounded-xl bg-slate-900/75 border border-slate-800/90 animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-3.5 w-24 bg-slate-800 rounded" />
            <div className="h-9 w-9 bg-slate-800 rounded-lg" />
          </div>
          <div className="h-7 w-20 bg-slate-800 rounded mb-2" />
          <div className="h-3 w-32 bg-slate-800/70 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 6 }) {
  return (
    <div className="w-full rounded-xl bg-slate-900/75 border border-slate-800/90 overflow-hidden">
      <div className="border-b border-slate-800/90 px-5 py-3.5 grid grid-cols-6 gap-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <div key={idx} className="h-3.5 bg-slate-800 rounded w-3/4 animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-slate-800/60">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-5 py-4 grid grid-cols-6 gap-4 items-center">
            {Array.from({ length: columns }).map((__, colIdx) => (
              <div
                key={colIdx}
                className="h-4 bg-slate-800/70 rounded animate-pulse"
                style={{ width: colIdx === 0 ? '85%' : '60%' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading({ label = 'Loading data...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-300">
      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
