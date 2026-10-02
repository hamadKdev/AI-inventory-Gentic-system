import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function RoleGuard({
  allowedRoles = ['manager'],
  children,
  fallback = null,
  showForbiddenMessage = false,
}) {
  const { role } = useAuth();
  const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());

  if (normalizedAllowed.includes(role)) {
    return children;
  }

  if (showForbiddenMessage) {
    return (
      <div className="p-6 rounded-xl bg-slate-900/80 border border-amber-500/30 text-slate-200 flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">Manager Access Required</h3>
          <p className="text-sm text-slate-300 mt-1">
            You do not have permission to perform this action.
          </p>
        </div>
      </div>
    );
  }

  return fallback;
}
