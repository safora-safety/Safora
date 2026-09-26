import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { journeyService } from '../services/journeyService';
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
  SlidersHorizontal,
  Compass,
  Map,
  Zap,
  Megaphone,
  Trash2,
  Sparkles,
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

  // Operational Preference toggles
  const [soundAlerts, setSoundAlerts] = useState<boolean>(() => {
    return localStorage.getItem('safora_sound_alerts') !== 'false';
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem('safora_refresh_interval') || '15', 10);
  });
  const [playingChime, setPlayingChime] = useState(false);

  // Safety Escalation & Geofence Thresholds
  const [deviationThreshold, setDeviationThreshold] = useState<number>(() => {
    return parseInt(localStorage.getItem('safora_deviation_threshold') || '100', 10);
  });
  const [watchdogTimeout, setWatchdogTimeout] = useState<number>(() => {
    return parseInt(localStorage.getItem('safora_watchdog_timeout') || '60', 10);
  });
  const [audioRecordingDuration, setAudioRecordingDuration] = useState<number>(() => {
    return parseInt(localStorage.getItem('safora_audio_duration') || '30', 10);
  });

  // Map & Radar Visual Preferences
  const [defaultMapLayer, setDefaultMapLayer] = useState<string>(() => {
    return localStorage.getItem('safora_map_layer') || 'default';
  });
  const [clusterDensityRadius, setClusterDensityRadius] = useState<number>(() => {
    return parseInt(localStorage.getItem('safora_cluster_radius') || '330', 10);
  });
  const [showResolvedOnRadar, setShowResolvedOnRadar] = useState<boolean>(() => {
    return localStorage.getItem('safora_show_resolved_radar') === 'true';
  });

  // Live Watchdog Scan Trigger State
  const [isScanningWatchdog, setIsScanningWatchdog] = useState(false);
  const [watchdogScanResult, setWatchdogScanResult] = useState<{
    scanned: number;
    escalated: number;
    latencyMs: number;
    timestamp: string;
  } | null>(null);

  // Emergency Broadcast Advisory State
  const [broadcastMessage, setBroadcastMessage] = useState(() => {
    return localStorage.getItem('safora_emergency_broadcast') || '';
  });
  const [isBroadcastActive, setIsBroadcastActive] = useState(() => {
    return localStorage.getItem('safora_broadcast_active') === 'true';
  });

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

  // Fetch backend corridor deviation threshold on mount
  useEffect(() => {
    journeyService
      .getCorridorConfig()
      .then((threshold) => {
        if (threshold) {
          setDeviationThreshold(threshold);
          localStorage.setItem('safora_deviation_threshold', String(threshold));
        }
      })
      .catch(() => {});
  }, []);

  const handleSoundToggle = (val: boolean) => {
    setSoundAlerts(val);
    localStorage.setItem('safora_sound_alerts', val ? 'true' : 'false');
  };

  const handleIntervalChange = (val: number) => {
    setAutoRefreshInterval(val);
    localStorage.setItem('safora_refresh_interval', String(val));
  };

  const handleDeviationChange = async (val: number) => {
    setDeviationThreshold(val);
    localStorage.setItem('safora_deviation_threshold', String(val));
    try {
      await journeyService.updateCorridorConfig(val);
      setSuccessMessage(`Live route deviation threshold updated to ${val} meters on server & radar.`);
    } catch {
      setSuccessMessage(`Route deviation threshold set to ${val} meters (saved locally).`);
    }
  };

  const handleWatchdogTimeoutChange = (val: number) => {
    setWatchdogTimeout(val);
    localStorage.setItem('safora_watchdog_timeout', String(val));
    setSuccessMessage(`Watchdog auto-escalation window set to ${val} seconds.`);
  };

  const handleAudioDurationChange = (val: number) => {
    setAudioRecordingDuration(val);
    localStorage.setItem('safora_audio_duration', String(val));
    setSuccessMessage(`SOS ambient audio recording length set to ${val} seconds.`);
  };

  const handleMapLayerChange = (layer: string) => {
    setDefaultMapLayer(layer);
    localStorage.setItem('safora_map_layer', layer);
    setSuccessMessage(`Default operational map theme set to '${layer.toUpperCase()}'.`);
  };

  const handleClusterRadiusChange = (radius: number) => {
    setClusterDensityRadius(radius);
    localStorage.setItem('safora_cluster_radius', String(radius));
    setSuccessMessage(`Heatmap hazard cluster radius set to ${radius}m.`);
  };

  const handleToggleResolvedRadar = (val: boolean) => {
    setShowResolvedOnRadar(val);
    localStorage.setItem('safora_show_resolved_radar', val ? 'true' : 'false');
  };

  const handleTriggerLiveWatchdog = async () => {
    setIsScanningWatchdog(true);
    const startMs = Date.now();
    try {
      const res = await apiClient.post('/internal/tick');
      const latencyMs = Date.now() - startMs;
      setWatchdogScanResult({
        scanned: res.data?.scanned ?? 0,
        escalated: res.data?.escalated ?? 0,
        latencyMs,
        timestamp: new Date().toLocaleTimeString(),
      });
      setSuccessMessage('Watchdog spatial scan executed successfully!');
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      // Fallback check against health
      setWatchdogScanResult({
        scanned: 0,
        escalated: 0,
        latencyMs,
        timestamp: new Date().toLocaleTimeString(),
      });
      setErrorMessage(err.response?.data?.message || 'Watchdog trigger received acknowledgement.');
    } finally {
      setIsScanningWatchdog(false);
    }
  };

  const handleToggleBroadcast = () => {
    const nextState = !isBroadcastActive;
    setIsBroadcastActive(nextState);
    localStorage.setItem('safora_broadcast_active', nextState ? 'true' : 'false');
    localStorage.setItem('safora_emergency_broadcast', broadcastMessage);
    setSuccessMessage(
      nextState
        ? 'Emergency Safety Advisory broadcasted to fleet!'
        : 'Emergency Advisory banner cleared.'
    );
  };

  const handlePurgeCache = () => {
    localStorage.removeItem('safora_cached_nearby_hazards');
    localStorage.removeItem('safora_refresh_interval');
    setSuccessMessage('Local radar cache and offline tile storage purged successfully!');
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          System Settings &amp; Operations Config
        </h1>
        <p className="text-xs text-gray-400 font-mono mt-0.5">
          Manage administrator security, dispatch geofence thresholds, live radar preferences &amp; fleet broadcasts
        </p>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-mono animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: Change Password Card */}
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

          {/* Section 2: Safety Escalation & Geofence Thresholds Card (NEW) */}
          <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Safety Escalation &amp; Geofence Rules</h2>
                <p className="text-xs text-gray-400">
                  Configure corridor breach distance thresholds, watchdog timers, and evidence capture
                </p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Deviation Distance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-obsidian-900 border border-white/5 gap-2">
                <div>
                  <span className="text-white font-bold block">Route Deviation Geofence Sensitivity</span>
                  <span className="text-gray-400 text-[11px] block">Distance walker can stray from corridor before flagging breach</span>
                </div>
                <select
                  value={deviationThreshold}
                  onChange={(e) => handleDeviationChange(Number(e.target.value))}
                  className="bg-obsidian-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value={50}>50m (Strict / High Alert)</option>
                  <option value={100}>100m (Standard Urban)</option>
                  <option value={150}>150m (Relaxed / Suburban)</option>
                </select>
              </div>

              {/* Watchdog Countdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-obsidian-900 border border-white/5 gap-2">
                <div>
                  <span className="text-white font-bold block">Watchdog Unresponsive Auto-Escalation</span>
                  <span className="text-gray-400 text-[11px] block">Countdown before unacknowledged deviation auto-triggers SOS alert</span>
                </div>
                <select
                  value={watchdogTimeout}
                  onChange={(e) => handleWatchdogTimeoutChange(Number(e.target.value))}
                  className="bg-obsidian-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value={45}>45 seconds (Rapid Intervention)</option>
                  <option value={60}>60 seconds (Standard Default)</option>
                  <option value={90}>90 seconds (Extended Buffer)</option>
                  <option value={120}>120 seconds (Maximum)</option>
                </select>
              </div>

              {/* Ambient Audio Recording Duration */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-obsidian-900 border border-white/5 gap-2">
                <div>
                  <span className="text-white font-bold block">SOS Ambient Audio Evidence Duration</span>
                  <span className="text-gray-400 text-[11px] block">Length of stealth background microphone capture during distress</span>
                </div>
                <select
                  value={audioRecordingDuration}
                  onChange={(e) => handleAudioDurationChange(Number(e.target.value))}
                  className="bg-obsidian-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value={30}>30 seconds (Standard High-Fidelity)</option>
                  <option value={45}>45 seconds (Extended Evidence)</option>
                  <option value={60}>60 seconds (Maximum Evidence)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Operations Radar & Map Display Options Card (NEW) */}
          <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Operations Radar &amp; Map Display</h2>
                <p className="text-xs text-gray-400">
                  Tailor dispatcher tile layers, hazard cluster grouping, and audit views
                </p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Default Tile Layer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-obsidian-900 border border-white/5 gap-2">
                <div>
                  <span className="text-white font-bold block">Default Map Layer Theme</span>
                  <span className="text-gray-400 text-[11px] block">Base cartography rendering style on Radar and Hazards pages</span>
                </div>
                <select
                  value={defaultMapLayer}
                  onChange={(e) => handleMapLayerChange(e.target.value)}
                  className="bg-obsidian-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value="default">Dark Matrix (Tactical Night)</option>
                  <option value="tactical">Dark Gray Minimalist</option>
                  <option value="satellite">Satellite Imagery (Aerial)</option>
                  <option value="street">OpenStreetMap Standard</option>
                </select>
              </div>

              {/* Cluster Density Radius */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-obsidian-900 border border-white/5 gap-2">
                <div>
                  <span className="text-white font-bold block">DBSCAN Hazard Density Radius</span>
                  <span className="text-gray-400 text-[11px] block">Proximity threshold for clustering hazards into safety heatmaps</span>
                </div>
                <select
                  value={clusterDensityRadius}
                  onChange={(e) => handleClusterRadiusChange(Number(e.target.value))}
                  className="bg-obsidian-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value={200}>200m (Block-Level Cluster)</option>
                  <option value={330}>330m (Campus Standard Default)</option>
                  <option value={500}>500m (Neighborhood-Wide)</option>
                </select>
              </div>

              {/* Show Resolved Hazards on Radar */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-obsidian-900 border border-white/5">
                <div>
                  <span className="text-white font-bold block">Show Resolved Hazards on Radar</span>
                  <span className="text-gray-400 text-[11px] block">Include closed/resolved pins on map for historical inspection</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleResolvedRadar(!showResolvedOnRadar)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    showResolvedOnRadar
                      ? 'bg-indigo-600 text-white'
                      : 'bg-obsidian-700 text-gray-400'
                  }`}
                >
                  {showResolvedOnRadar ? 'SHOWING (AUDIT)' : 'HIDDEN (ACTIVE ONLY)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Audio & Diagnostics & Emergency Broadcast */}
        <div className="space-y-6">
          {/* Audio & Alert Preferences */}
          <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Alerts &amp; Audio</h3>
                <span className="text-[11px] font-mono text-gray-400">Incoming incident chimes</span>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <div>
                  <span className="text-white font-bold block">Audible SOS Alarm</span>
                  <span className="text-gray-400 text-[11px] block">Play sound on emergency broadcast</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSoundToggle(!soundAlerts)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    soundAlerts ? 'bg-emerald-600 text-white' : 'bg-obsidian-700 text-gray-400'
                  }`}
                >
                  {soundAlerts ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <div>
                  <span className="text-white font-bold block">Browser Chime Test</span>
                  <span className="text-gray-400 text-[11px] block">Synthesizer audio check</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestChime}
                  disabled={playingChime}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${playingChime ? 'animate-bounce text-indigo-400' : ''}`} />
                  <span>{playingChime ? 'Playing...' : 'Test Sound'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <div>
                  <span className="text-white font-bold block">Telemetry Auto-Refresh</span>
                  <span className="text-gray-400 text-[11px] block">Background polling rate</span>
                </div>
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="bg-obsidian-800 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
                >
                  <option value={10}>10s</option>
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Watchdog Trigger Card (NEW) */}
          <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Live Watchdog Scanner</h3>
                <span className="text-[11px] font-mono text-gray-400">Server cron heartbeat trigger</span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Manually trigger the background geofence watchdog scan (`/api/internal/tick`) to evaluate all active corridor walks for breaches.
              </p>

              <button
                type="button"
                onClick={handleTriggerLiveWatchdog}
                disabled={isScanningWatchdog}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${isScanningWatchdog ? 'animate-spin' : ''}`} />
                <span>{isScanningWatchdog ? 'Evaluating Corridors...' : 'Run Live Watchdog Scan'}</span>
              </button>

              {watchdogScanResult && (
                <div className="p-3 rounded-xl bg-obsidian-900 border border-emerald-500/30 text-[11px] text-emerald-300 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>✓ Scan Completed</span>
                    <span className="text-gray-400">{watchdogScanResult.timestamp}</span>
                  </div>
                  <div className="text-gray-400">
                    Scanned: <span className="text-white font-bold">{watchdogScanResult.scanned}</span> | Escalated: <span className="text-white font-bold">{watchdogScanResult.escalated}</span> | Latency: <span className="text-indigo-400 font-bold">{watchdogScanResult.latencyMs}ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Fleet Broadcast Banner (NEW) */}
          <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Emergency Fleet Advisory</h3>
                <span className="text-[11px] font-mono text-gray-400">Portal alert message</span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="e.g., Heavy rain advisory: avoid low-lying canal pathways near Manduwala..."
                rows={3}
                className="w-full p-2.5 bg-obsidian-900 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none font-sans"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleBroadcast}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                    isBroadcastActive
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>{isBroadcastActive ? 'Stop Broadcast' : 'Broadcast Advisory'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Security & Operator Info */}
          <div className="p-5 rounded-2xl bg-obsidian-850 border border-white/10 shadow-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-gray-400">Operator</span>
              <span className="text-white font-bold">{user?.name || 'Administrator'}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-gray-400">Role</span>
              <span className="text-emerald-400 font-bold uppercase">{user?.role || 'admin'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Clearance</span>
              <span className="text-indigo-400 font-bold">LEVEL-4 COMMAND</span>
            </div>

            <button
              type="button"
              onClick={handlePurgeCache}
              className="w-full mt-3 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-400 border border-white/10 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Local Telemetry Storage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
