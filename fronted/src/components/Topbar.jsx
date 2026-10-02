import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Bot, RefreshCw, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';

const ROUTE_TITLES = {
  '/dashboard': 'Operations Dashboard',
  '/products': 'Product Catalog & Stock',
  '/stock-in': 'Stock In — Receive Inventory',
  '/stock-out': 'Stock Out — Dispatch Inventory',
  '/sales': 'Record Sale Transaction',
  '/stock-history': 'Stock Movement History',
  '/reports': 'Inventory & Sales Reports',
  '/ai-assistant': 'AI Inventory Assistant',
};

export default function Topbar({ onOpenSidebar, onToggleFloatingAI }) {
  const { user, role, isManager, logout, triggerDataRefresh } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const pageTitle = ROUTE_TITLES[location.pathname] || 'Nowshera Shopping Mall';

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out.');
    navigate('/login', { replace: true });
  };

  const handleRefresh = () => {
    triggerDataRefresh();
    toast.info('Refreshing live inventory data...');
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#0B1021]/90 border-b border-slate-800/90 backdrop-blur-xl flex items-center justify-between gap-4 shrink-0 z-30">
      {/* Zone 1: Menu Trigger + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-slate-100 truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Zone 2: User Identity & Role */}
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-300">
        <span className="font-medium text-slate-100 truncate max-w-[180px]">
          {user?.name || 'Authenticated User'}
        </span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span
          className={`font-semibold uppercase tracking-wider ${
            isManager ? 'text-cyan-400' : 'text-indigo-300'
          }`}
        >
          {role}
        </span>
      </div>

      {/* Zone 3: Quick Actions & Logout */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRefresh}
          className="p-2 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors"
          title="Refresh data"
          aria-label="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="p-2 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 transition-colors"
          title="Low stock alerts"
          aria-label="Low stock alerts"
        >
          <Bell className="w-4 h-4" />
        </button>

        {location.pathname !== '/ai-assistant' && (
          <button
            type="button"
            onClick={onToggleFloatingAI}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/30 text-xs font-medium text-indigo-200 transition-colors whitespace-nowrap"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ask AI</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-rose-950/70 border border-slate-700/80 hover:border-rose-500/40 text-xs font-medium text-slate-200 hover:text-rose-200 transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
