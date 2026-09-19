import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      const user = authService.getStoredUser();

      // Strict security: Enforce admin or moderator role requirement
      if (user && user.role !== 'admin' && user.role !== 'moderator') {
        authService.logout();
        setError('Access Denied: Administrator or Dispatcher privileges required.');
        return;
      }

      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Authentication failed. Verify your authorized administrator credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-indigo-950 shadow-xl">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            SAFORA Command Center
          </h1>
          <p className="text-xs uppercase tracking-widest text-indigo-400 font-mono mt-1 font-semibold">
            Restricted Operator &amp; Dispatcher Authorization
          </p>
        </div>

        {/* Login Card */}
        <div className="p-8 rounded-2xl bg-obsidian-850/90 border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-mono tracking-wider text-gray-400 mb-1.5 font-semibold">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-900 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-gray-600 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider text-gray-400 mb-1.5 font-semibold">
                Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-obsidian-900 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-gray-600 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-400 hover:text-white" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-indigo-950/50 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Authenticating Privileges...' : 'Access Command Center'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="p-3 rounded-xl bg-obsidian-900/60 border border-white/5 text-[11px] text-gray-400 text-center font-mono">
            Public registrations disabled. Access restricted to authorized security dispatchers.
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-[11px] text-gray-500 mt-6 font-mono">
          Connected to SAFORA Security Dispatch API &bull; 256-Bit Encrypted
        </p>
      </div>
    </div>
  );
};
