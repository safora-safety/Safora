import React, { useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  KeyRound,
  Shield,
  Bell,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Server,
  RefreshCw,
  Volume2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preference toggles
  const [soundAlerts, setSoundAlerts] = useState<boolean>(() => {
    return localStorage.getItem('safora_sound_alerts') !== 'false';
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem('safora_refresh_interval') || '15', 10);
  });
  const [playingChime, setPlayingChime] = useState(false);

  const handleTestChime = () => {
    try {
      setPlayingChime(true);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
      setTimeout(() => setPlayingChime(false), 850);
    } catch (err) {
      console.warn('Audio test failed:', err);
      setPlayingChime(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!oldPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match. Please verify.');
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      if (response.data?.success) {
        setSuccessMessage('Password changed successfully! Your account credentials have been updated.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(response.data?.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to change password. Please ensure your current password is correct.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoundToggle = (val: boolean) => {
    setSoundAlerts(val);
    localStorage.setItem('safora_sound_alerts', val ? 'true' : 'false');
  };

  const handleIntervalChange = (val: number) => {
    setAutoRefreshInterval(val);
    localStorage.setItem('safora_refresh_interval', String(val));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          System Settings & Security
        </h1>
        <p className="text-xs text-gray-400 font-mono mt-0.5">
          Manage administrator credentials, security policies, and real-time dashboard preferences
        </p>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-mono">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Change Password Card (Takes 2 cols) */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Change Admin Password</h2>
                <p className="text-xs text-gray-400">
                  Update your credentials directly. New passwords are encrypted using bcrypt hashing.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-mono font-medium text-gray-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-obsidian-900 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-mono font-medium text-gray-300 mb-1.5">
                  New Password <span className="text-gray-500">(minimum 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Enter strong new password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-obsidian-900 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-mono font-medium text-gray-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Re-enter new password to verify"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-obsidian-900 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-950"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Operational Preferences Card */}
          <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Operations & Alerts</h2>
                <p className="text-xs text-gray-400">
                  Control real-time notifications and telemetry telemetry frequency
                </p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <div>
                  <span className="text-white font-bold block">Audible SOS Alarm</span>
                  <span className="text-gray-400 text-[11px] block">Play sound on incoming emergency distress broadcasts</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestChime}
                    disabled={playingChime}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Test audible emergency chime in browser"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${playingChime ? 'animate-bounce text-indigo-400' : ''}`} />
                    <span>{playingChime ? 'Playing...' : 'Test Chime'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSoundToggle(!soundAlerts)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                      soundAlerts
                        ? 'bg-emerald-600 text-white'
                        : 'bg-obsidian-700 text-gray-400'
                    }`}
                  >
                    {soundAlerts ? 'ENABLED' : 'MUTED'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <div>
                  <span className="text-white font-bold block">Telemetry Auto-Refresh</span>
                  <span className="text-gray-400 text-[11px] block">Background polling rate for map and radar updates</span>
                </div>
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="bg-obsidian-800 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
                >
                  <option value={10}>10 seconds</option>
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Clearance & Session Info */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Active Clearance</h3>
                <span className="text-[11px] font-mono text-gray-400">Security Clearance Level</span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase">Logged-in Operator</span>
                <span className="text-white font-bold text-xs mt-0.5 block truncate">
                  {user?.name || 'Administrator'}
                </span>
                <span className="text-indigo-400 text-[11px] block mt-0.5 truncate">
                  {user?.email || 'admin@safora.safety'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase">Authorization Role</span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs mt-0.5 block">
                  {user?.role || 'admin'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase">Backend Status</span>
                <span className="text-indigo-300 text-[11px] mt-0.5 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  Render Production
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 font-mono space-y-2">
            <span className="font-bold flex items-center gap-1.5 text-white">
              🛡️ Security Best Practice
            </span>
            <p className="text-[11px] leading-relaxed text-indigo-200/80">
              Never share administrative credentials. In emergency environments, password rotations should be performed regularly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
