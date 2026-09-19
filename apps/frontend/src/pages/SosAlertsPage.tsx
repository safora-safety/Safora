import React, { useState, useEffect } from 'react';
import { sosService } from '../services/sosService';
import { useSocket } from '../context/SocketContext';
import { SosNotification } from '@safora/shared-types';
import { Badge } from '../components/common/Badge';
import { AudioPlayer } from '../components/common/AudioPlayer';
import {
  Flame,
  Battery,
  MapPin,
  Clock,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  ExternalLink,
  Volume2,
} from 'lucide-react';

export const SosAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<SosNotification[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SosNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { activeEmergency } = useSocket();

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await sosService.getNotifications();
      setAlerts(data);
      if (data.length > 0 && !selectedAlert) {
        setSelectedAlert(data[0]);
      }
    } catch (err) {
      console.warn('Failed to load SOS alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolveAlert = async (id: string | number) => {
    try {
      await sosService.markRead(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
      if (selectedAlert?.id === id) {
        setSelectedAlert((prev) => (prev ? { ...prev, isRead: true } : null));
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleResolveAll = async () => {
    try {
      await sosService.markAllRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch (err) {
      console.error('Failed to resolve all alerts:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Emergency SOS Response Queue
            </h1>
            <Badge variant="danger" pulse={activeEmergency !== null}>
              PRIORITY LEVEL 1
            </Badge>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time SOS Dispatch &bull; Ambient Cloudinary Audio Evidence &bull; GPS Tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResolveAll}
            className="px-3.5 py-2 rounded-xl bg-obsidian-800 hover:bg-obsidian-700 border border-white/10 text-gray-300 font-semibold text-xs transition-colors"
          >
            Mark All Resolved
          </button>
          <button
            onClick={loadAlerts}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Main Split View: Queue List on Left, Selected Alert Details & Audio on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alerts List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 pb-1">
            <span>INBOUND BEACONS ({alerts.length})</span>
            <span>STATUS</span>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {alerts.length === 0 && !isLoading && (
              <div className="p-8 rounded-2xl bg-obsidian-850/80 border border-white/10 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-white">All Clear</p>
                <p className="text-xs text-gray-400">
                  No active emergency SOS alerts pending in the regional grid.
                </p>
              </div>
            )}

            {alerts.map((alert) => {
              const isSelected = selectedAlert?.id === alert.id;
              return (
                <div
                  key={`alert-item-${alert.id}`}
                  onClick={() => setSelectedAlert(alert)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-obsidian-700 border-red-500/60 shadow-lg shadow-red-950/30 ring-1 ring-red-500/40'
                      : alert.isRead
                      ? 'bg-obsidian-850/60 border-white/5 opacity-70 hover:opacity-100 hover:border-white/10'
                      : 'bg-obsidian-800/90 border-red-500/30 hover:border-red-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          alert.isRead ? 'bg-emerald-400' : 'bg-red-500 animate-ping'
                        }`}
                      ></span>
                      <span className="font-bold text-sm text-white">{alert.senderName}</span>
                    </div>
                    <Badge
                      variant={alert.isRead ? 'success' : 'danger'}
                      size="sm"
                      pulse={!alert.isRead}
                    >
                      {alert.isRead ? 'RESOLVED' : 'DISPATCHED'}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-300 mt-2 line-clamp-2">{alert.body}</p>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-gray-400 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {alert.createdAt
                        ? new Date(alert.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Live'}
                    </span>
                    {alert.batteryPercentage !== undefined && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Battery className="w-3 h-3" />
                        {alert.batteryPercentage}%
                      </span>
                    )}
                    {alert.audioUrl && (
                      <span className="flex items-center gap-1 text-indigo-400">
                        <Volume2 className="w-3 h-3" />
                        Audio
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Alert Details View (7 cols) */}
        <div className="lg:col-span-7">
          {selectedAlert ? (
            <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 shadow-2xl space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-red-400 font-bold">
                      INCIDENT CASE #{selectedAlert.id}
                    </span>
                    <Badge variant={selectedAlert.isRead ? 'success' : 'danger'} pulse={!selectedAlert.isRead}>
                      {selectedAlert.isRead ? 'CASE RESOLVED' : 'ACTIVE EMERGENCY'}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-black text-white mt-1">
                    {selectedAlert.senderName}
                  </h2>
                  {selectedAlert.senderPhone && (
                    <p className="text-xs text-indigo-400 font-mono mt-0.5">
                      Phone Contact: {selectedAlert.senderPhone}
                    </p>
                  )}
                </div>

                {!selectedAlert.isRead && (
                  <button
                    onClick={() => handleResolveAlert(selectedAlert.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Acknowledge & Resolve</span>
                  </button>
                )}
              </div>

              {/* Coordinates & Telemetry Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase font-mono">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>GPS Telemetry</span>
                  </div>
                  <div className="text-base font-mono font-bold text-white">
                    {selectedAlert.latitude?.toFixed(5) || '30.3165'}, {selectedAlert.longitude?.toFixed(5) || '78.0322'}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedAlert.latitude},${selectedAlert.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium pt-1"
                  >
                    Open in External Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-4 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase font-mono">
                    <Battery className="w-3.5 h-3.5 text-amber-400" />
                    <span>Device Battery Level</span>
                  </div>
                  <div className="text-base font-mono font-bold text-amber-400">
                    {selectedAlert.batteryPercentage || 85}% Remaining
                  </div>
                  <div className="text-xs text-gray-400">
                    Transmitted via SAFORA Safety Guard
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-4 rounded-xl bg-obsidian-800/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-gray-400 font-semibold">
                  Transmitted Emergency Message
                </span>
                <p className="text-sm text-gray-200 leading-relaxed font-sans">
                  {selectedAlert.body}
                </p>
              </div>

              {/* Cloudinary Ambient Audio Evidence Scrubber */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-gray-400 font-semibold">
                  30-Second Ambient Audio Evidence
                </span>
                <AudioPlayer
                  audioUrl={selectedAlert.audioUrl}
                  title={`SOS Ambient Recording — ${selectedAlert.senderName}`}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 rounded-2xl bg-obsidian-850/50 border border-white/5 text-center text-gray-400">
              Select an alert from the queue to view telemetry and listen to audio evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
