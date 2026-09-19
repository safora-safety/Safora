import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Shield, LogOut, Clock } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [timeZone, setTimeZone] = useState<'IST' | 'UTC'>('IST');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (timeZone === 'IST') {
        setCurrentTime(
          now.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } else {
        setCurrentTime(
          now.toLocaleTimeString('en-GB', {
            timeZone: 'UTC',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeZone]);

  return (
    <header className="h-16 border-b border-white/10 bg-obsidian-850/90 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Command Level */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-indigo-950/50 shadow-md">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base text-white">SAFORA</span>
            <span className="text-[10px] tracking-widest text-indigo-400 uppercase font-mono block -mt-1 font-semibold">
              Operations Command
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>

        {/* Backend & Socket Health Beacon */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-obsidian-700/60 border border-white/5 text-xs font-mono">
          <span className="relative flex h-2 w-2">
            {isConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            )}
          </span>
          <span className="text-gray-300">
            {isConnected ? 'LIVE DISPATCH SOCKET' : 'CONNECTING...'}
          </span>
        </div>
      </div>

      {/* Clock & Operator Controls */}
      <div className="flex items-center gap-4">
        {/* Tactical Clock */}
        <button
          onClick={() => setTimeZone(timeZone === 'IST' ? 'UTC' : 'IST')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian-700/50 border border-white/10 hover:border-white/20 transition-colors text-xs font-mono text-gray-300"
          title="Click to toggle IST / UTC"
        >
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{currentTime || '00:00:00'}</span>
          <span className="text-indigo-400 font-bold text-[10px]">{timeZone}</span>
        </button>

        {/* Operator Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white">
              {user?.name || 'Command Dispatcher'}
            </div>
            <div className="text-[10px] uppercase font-mono text-indigo-400">
              {user?.role || 'Admin'}
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-obsidian-700/60 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-colors"
            title="Sign out of Command Center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
