import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bot, X } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import AIChat from './AIChat.jsx';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [floatingAIOpen, setFloatingAIOpen] = useState(false);
  const location = useLocation();

  const isDedicatedAIPage = location.pathname === '/ai-assistant';

  return (
    <div className="min-h-screen bg-[#090D1A] text-slate-100 flex relative overflow-hidden">
      {/* Ambient Background Glow Shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-indigo-600/10 blur-3xl animate-float-reverse" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl animate-float-slow" />
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Topbar
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleFloatingAI={() => setFloatingAIOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Assistant Button & Drawer (available throughout authenticated app) */}
      {!isDedicatedAIPage && (
        <>
          {floatingAIOpen && (
            <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-w-full animate-page-enter">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFloatingAIOpen(false)}
                  className="absolute -top-3 -right-2 z-10 p-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-lg"
                  aria-label="Close floating AI chat"
                >
                  <X className="w-4 h-4" />
                </button>
                <AIChat compact />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setFloatingAIOpen((prev) => !prev)}
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-xl shadow-cyan-500/25 transition-all duration-150"
            aria-label="Toggle AI Inventory Assistant"
          >
            <Bot className="w-5 h-5" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>
        </>
      )}
    </div>
  );
}
