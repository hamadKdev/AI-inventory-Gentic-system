import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingBag,
  History,
  BarChart3,
  Bot,
  Boxes,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({ isOpen, onClose }) {
  const { isManager, user } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      roles: ['manager', 'staff'],
    },
    {
      label: 'Products',
      to: '/products',
      icon: Package,
      roles: ['manager', 'staff'],
    },
    {
      label: 'Stock In',
      to: '/stock-in',
      icon: ArrowDownToLine,
      roles: ['manager', 'staff'],
    },
    {
      label: 'Stock Out',
      to: '/stock-out',
      icon: ArrowUpFromLine,
      roles: ['manager', 'staff'],
    },
    {
      label: 'Sales',
      to: '/sales',
      icon: ShoppingBag,
      roles: ['manager', 'staff'],
    },
    {
      label: 'Stock History',
      to: '/stock-history',
      icon: History,
      roles: ['manager', 'staff'],
    },
    {
      label: 'Reports',
      to: '/reports',
      icon: BarChart3,
      roles: ['manager'],
    },
    {
      label: 'AI Assistant',
      to: '/ai-assistant',
      icon: Bot,
      roles: ['manager', 'staff'],
    },
  ];

  const currentRole = isManager ? 'manager' : 'staff';
  const filteredNav = navItems.filter((item) => item.roles.includes(currentRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1021]/95 border-r border-slate-800/90 backdrop-blur-xl flex flex-col transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-slate-100 truncate">
                Nowshera Mall
              </span>
              <span className="block text-[11px] text-slate-400 truncate">
                Inventory System
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/15 to-transparent text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer Summary */}
        <div className="p-4 border-t border-slate-800/90 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 truncate">{user?.email || user?.name}</span>
            <span className="text-slate-500">·</span>
            <span
              className={`font-semibold capitalize ${
                isManager ? 'text-cyan-400' : 'text-indigo-300'
              }`}
            >
              {currentRole}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
