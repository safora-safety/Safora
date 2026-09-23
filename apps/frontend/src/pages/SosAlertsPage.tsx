import React, { useState, useEffect } from 'react';
import { sosService, AdminSosAlert } from '../services/sosService';
import { useSocket } from '../context/SocketContext';
import { Badge } from '../components/common/Badge';
import { AudioPlayer } from '../components/common/AudioPlayer';
import {
  Battery,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Volume2,
  ShieldAlert,
} from 'lucide-react';

export const SosAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AdminSosAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AdminSosAlert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { socket, activeEmergency } = useSocket();

  const loadAlerts = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await sosService.getAdminAlerts();
      setAlerts(data);
      if (data.length > 0) {
        setSelectedAlert((prev) => {
          if (!prev) return data[0];
          const found = data.find((a) => a.id === prev.id);
          return found || data[0];
        });
      } else {
        setSelectedAlert(null);
      }
    } catch (err) {
      console.warn('Failed to load SOS alerts:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  // Real-time automatic background updates when new citizen SOS or audio arrives without full-screen loading spinner
  useEffect(() => {
    if (!socket) return;
    const handleAlert = () => {
      loadAlerts(true);
    };
    const handleAudio = () => {
      loadAlerts(true);
    };

    socket.on('sos:alert', handleAlert);
    socket.on('sos:audio', handleAudio);

    return () => {
      socket.off('sos:alert', handleAlert);
      socket.off('sos:audio', handleAudio);
    };
  }, [socket]);

  const handleUpdateStatus = async (
    id: string | number,
    status: 'dispatched' | 'acknowledged' | 'resolved',
  ) => {
    try {
      await sosService.updateAlertStatus(id, status);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
      if (selectedAlert?.id === id) {
        setSelectedAlert((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      console.error('Failed to update alert status:', err);
    }
  };

  const handleResolveAll = async () => {
    const unresolved = alerts.filter((a) => a.status !== 'resolved');
    if (unresolved.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to mark all ${unresolved.length} active emergency alert(s) as resolved? This action will archive them as handled.`,
    );
    if (!confirmed) return;

    try {
      await Promise.all(
        unresolved.map((a) => sosService.updateAlertStatus(a.id, 'resolved')),
      );
      setAlerts((prev) => prev.map((a) => ({ ...a, status: 'resolved' })));
      if (selectedAlert) {
        setSelectedAlert((prev) =>
          prev ? { ...prev, status: 'resolved' } : null,
        );
      }
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
              OPERATIONS LIVE DISPATCH
            </Badge>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time Citizen SOS Queue (up to 100 recent) &bull; Cloudinary Audio Evidence &bull; GPS Telemetry
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
            onClick={() => loadAlerts(false)}
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
            <span>
              CITIZEN BEACONS ({alerts.length}){' '}
              <span className="text-[10px] text-gray-500 font-normal">
                (LATEST 100)
              </span>
            </span>
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
              const isResolved = alert.status === 'resolved';
              const isAcknowledged = alert.status === 'acknowledged';

              return (
                <div
                  key={`alert-item-${alert.id}`}
                  onClick={() => setSelectedAlert(alert)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-obsidian-700 border-red-500/60 shadow-lg shadow-red-950/30 ring-1 ring-red-500/40'
                      : isResolved
                      ? 'bg-obsidian-850/60 border-white/5 opacity-70 hover:opacity-100 hover:border-white/10'
                      : 'bg-obsidian-800/90 border-red-500/30 hover:border-red-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isResolved
                            ? 'bg-emerald-400'
                            : isAcknowledged
                            ? 'bg-amber-400'
                            : 'bg-red-500 animate-ping'
                        }`}
                      ></span>
                      <span className="font-bold text-sm text-white">
                        {alert.userName || 'Citizen Beacon'}
                      </span>
                      {alert.isTest && (
                        <span className="text-[10px] font-mono uppercase bg-obsidian-700 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded">
                          TEST
                        </span>
                      )}
                      {alert.source === 'watchdog' && (
                        <span className="text-[10px] font-mono uppercase bg-amber-950/60 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded">
                          WATCHDOG
                        </span>
                      )}
                    </div>
                    <Badge
                      variant={
                        isResolved
                          ? 'success'
                          : isAcknowledged
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                      pulse={alert.status === 'dispatched'}
                    >
                      {alert.status.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-300 mt-2 line-clamp-2">
                    {alert.isTest
                      ? 'System verification drill (Staff simulated dispatch).'
                      : alert.source === 'watchdog'
                      ? 'Automatic watchdog escalation: safe walk route deviation unconfirmed after 60s.'
                      : `Emergency SOS triggered at coordinates ${alert.latitude?.toFixed(4)}, ${alert.longitude?.toFixed(4)}.`}
                  </p>

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
                        Audio Evidence
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-red-400 font-bold">
                      INCIDENT CASE #{selectedAlert.id}
                    </span>
                    <Badge
                      variant={
                        selectedAlert.status === 'resolved'
                          ? 'success'
                          : selectedAlert.status === 'acknowledged'
                          ? 'warning'
                          : 'danger'
                      }
                      pulse={selectedAlert.status === 'dispatched'}
                    >
                      {selectedAlert.status.toUpperCase()}
                    </Badge>
                    {selectedAlert.isTest && (
                      <Badge variant="neutral">DRILL / TEST</Badge>
                    )}
                    {selectedAlert.source === 'watchdog' && (
                      <Badge variant="warning">WATCHDOG DEVIATION</Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white mt-1">
                    {selectedAlert.userName || 'Citizen Beacon'}
                  </h2>
                  {selectedAlert.userPhone && (
                    <p className="text-xs text-indigo-400 font-mono mt-0.5">
                      Phone Contact: {selectedAlert.userPhone}
                    </p>
                  )}
                  {selectedAlert.userEmail && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      Email: {selectedAlert.userEmail}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedAlert.status === 'dispatched' && (
                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedAlert.id, 'acknowledged')
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-lg"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Acknowledge</span>
                    </button>
                  )}
                  {selectedAlert.status !== 'resolved' && (
                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedAlert.id, 'resolved')
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Coordinates & Telemetry Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase font-mono">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>GPS Telemetry</span>
                  </div>
                  <div className="text-base font-mono font-bold text-white">
                    {selectedAlert.latitude?.toFixed(5) || '30.3165'},{' '}
                    {selectedAlert.longitude?.toFixed(5) || '78.0322'}
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
                    {selectedAlert.batteryPercentage ?? 85}% Remaining
                  </div>
                  <div className="text-xs text-gray-400">
                    Transmitted via SAFORA Safety Guard
                  </div>
                </div>
              </div>

              {/* Incident Details Card */}
              <div className="p-4 rounded-xl bg-obsidian-800/60 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-400 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Incident Telemetry Details</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed font-sans">
                  {selectedAlert.isTest
                    ? 'This is a verified test drill dispatched for operations team response training.'
                    : `Emergency signal dispatched by user #${selectedAlert.userId}. Accuracy: ±${selectedAlert.accuracy || 5}m. Journey ID: ${selectedAlert.journeyId || 'None (Direct SOS)'}.`}
                </p>
              </div>

              {/* Cloudinary Ambient Audio Evidence Scrubber */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-gray-400 font-semibold">
                  Ambient Audio Evidence
                </span>
                <AudioPlayer
                  audioUrl={selectedAlert.audioUrl || undefined}
                  title={`SOS Ambient Recording — ${selectedAlert.userName || 'Citizen'}`}
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
