import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Boxes,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  BarChart3,
  Bot,
  PackageCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const profile = await login(email, password);
      toast.success(`Welcome back, ${profile.name}!`);
      navigate(from, { replace: true });
    } catch (error) {
      const msg =
        error?.message || 'Unable to sign in. Please verify your credentials.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B16] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Animated Gradient Background Shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl animate-float-slow" />
        <div className="absolute top-1/4 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-600/20 blur-3xl animate-float-reverse" />
        <div className="absolute -bottom-28 left-1/3 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl animate-float-slow" />
      </div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-slate-900/75 border border-slate-800/90 backdrop-blur-2xl shadow-2xl overflow-hidden animate-page-enter">
        {/* Left Feature Panel */}
        <div className="hidden lg:flex lg:col-span-5 p-8 bg-gradient-to-br from-indigo-950/90 via-slate-900/90 to-cyan-950/70 border-r border-slate-800/80 flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 mb-6">
              <Boxes className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 leading-snug">
              Real-Time Mall Operations & AI Inventory Control
            </h2>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Authorized staff and managers can track stock movements, record
              sales, inspect low-stock alerts, and interact with the n8n AI
              Inventory Assistant.
            </p>
          </div>

          <div className="space-y-3.5 pt-6 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-300">
                <PackageCheck className="w-4 h-4" />
              </div>
              <span>Live stock tracking & verified movements</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-300">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span>Role-based manager & staff analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/15 text-purple-300">
                <Bot className="w-4 h-4" />
              </div>
              <span>AI Assistant with stock confirmation safety</span>
            </div>
          </div>
        </div>

        {/* Right Login Card */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                Nowshera Shopping Mall
              </h1>
              <p className="text-xs sm:text-sm font-medium text-cyan-400">
                Inventory Management System
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Sign in with your internal Manager or Staff credentials to access
            the inventory workspace.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={submitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@mall.com"
                  className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all duration-150 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Login to Inventory System</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Internal Access Only · Manager & Staff Roles</span>
            <span>JWT Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
