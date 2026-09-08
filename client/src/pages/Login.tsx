import React, { useState } from 'react';
import { SignIn, SignUp, SignInButton, SignUpButton } from '@clerk/react';
import { useAuth } from '../context/AuthContext';
import { Clapperboard, Lock, Mail, User as UserIcon, Building, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const [authMode, setAuthMode] = useState<'clerk-signin' | 'clerk-signup' | 'demo'>('clerk-signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authMode === 'demo' && !email.includes('luminastudio')) {
        await register(email, password, fullName, orgName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(userEmail, 'password123');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-600/30 mb-3">
            <Clapperboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Media Review Platform</h1>
          <p className="text-xs text-slate-400 mt-1">
            Studio-grade review room with Google Drive storage & timestamped approvals
          </p>

          {/* Clerk Auth Quick Buttons Header */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <SignInButton mode="modal">
              <button className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer">
                Clerk Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-3.5 py-1.5 rounded-xl bg-[#181c2b] hover:bg-[#202538] text-slate-200 border border-[#2d344d] text-xs font-semibold transition-all cursor-pointer">
                Clerk Sign Up
              </button>
            </SignUpButton>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#111420] border border-[#202538] rounded-xl p-1 mb-4 text-xs font-semibold">
          <button
            onClick={() => setAuthMode('clerk-signin')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              authMode === 'clerk-signin' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthMode('clerk-signup')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              authMode === 'clerk-signup' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setAuthMode('demo')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              authMode === 'demo' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Demo Accounts
          </button>
        </div>

        {/* Auth Body */}
        {authMode === 'clerk-signin' ? (
          <div className="flex justify-center">
            <SignIn
              routing="hash"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-slate-900/95 border border-slate-800 shadow-2xl',
                },
              }}
            />
          </div>
        ) : authMode === 'clerk-signup' ? (
          <div className="flex justify-center">
            <SignUp
              routing="hash"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-slate-900/95 border border-slate-800 shadow-2xl',
                },
              }}
            />
          </div>
        ) : (
          /* Demo login card */
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="text-center mb-5">
              <span className="text-xs font-semibold text-indigo-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Studio Demo Access</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Click below to instantly log in with pre-populated projects & reviews.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-2 mb-5">
              <button
                type="button"
                onClick={() => handleQuickLogin('arjun@luminastudio.com')}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="font-semibold text-xs text-white group-hover:text-indigo-300 block">Arjun Verma</span>
                  <span className="text-[10px] text-slate-400">Studio Owner • arjun@luminastudio.com</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('priya@luminastudio.com')}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="font-semibold text-xs text-white group-hover:text-indigo-300 block">Priya Sen</span>
                  <span className="text-[10px] text-slate-400">Editor / Contributor • priya@luminastudio.com</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Custom email login form */}
            <form onSubmit={handleSubmit} className="pt-4 border-t border-slate-800/80 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Custom Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In with Password'}
              </button>
            </form>
          </div>
        )}

        {/* Client link prompt */}
        <div className="mt-4 text-center">
          <a
            href="/review/sharma-wedding-teaser-review"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
          >
            Looking to review media as a client? Open the Client Review Room →
          </a>
        </div>
      </div>
    </div>
  );
};
