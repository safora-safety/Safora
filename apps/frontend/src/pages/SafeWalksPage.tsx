import React, { useState, useEffect } from 'react';
import { journeyService, ActiveJourney } from '../services/journeyService';
import { useSocket } from '../context/SocketContext';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import {
  Footprints,
  Clock,
  AlertTriangle,
  RefreshCw,
  Phone,
  ShieldCheck,
  Radio,
  ExternalLink,
  MapPin,
  Share2,
  CheckCircle,
  XCircle,
  Sparkles,
  Search,
  Battery,
  Gauge,
  Edit3,
  Mail,
  SlidersHorizontal,
} from 'lucide-react';

export const SafeWalksPage: React.FC = () => {
  const { socket } = useSocket();
  const [journeys, setJourneys] = useState<ActiveJourney[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deviated' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Corridor Detail Modal State
  const [selectedJourney, setSelectedJourney] = useState<ActiveJourney | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadJourneys = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setLoadError(null);
    try {
      // Fetch all walks from backend with full details
      const result = await journeyService.getAllJourneys();
      setJourneys(result);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load journeys:', err);
      if (!silent) setLoadError("Couldn't load Safe Walks from backend. Please verify your connection.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJourneys();
  }, []);

  // 15-second auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadJourneys(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Real-time Socket.IO live updates & audio escalation chime
  useEffect(() => {
    if (!socket) return;

    const handleLocation = (data: any) => {
      // If newly deviated, trigger operator audio ping
      if (data.deviated) {
        const soundEnabled = localStorage.getItem('safora_sound_alerts') !== 'false';
        if (soundEnabled) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(784, audioCtx.currentTime); // G5
            osc.frequency.setValueAtTime(587, audioCtx.currentTime + 0.15); // D5
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
          } catch { }
        }
      }

      setJourneys((prev) =>
        prev.map((j) => {
          if (String(j.id) === String(data.journeyId)) {
            return {
              ...j,
              currentLocation: { latitude: data.latitude, longitude: data.longitude },
              lastLocation: { latitude: data.latitude, longitude: data.longitude },
              status: data.deviated ? 'deviated' : j.status === 'deviated' ? 'active' : j.status,
              battery: data.battery ?? j.battery,
              speed: data.speed ?? j.speed,
            };
          }
          return j;
        })
      );
    };

    const handleStart = () => {
      loadJourneys(true);
    };

    const handleEnded = (data: any) => {
      setJourneys((prev) =>
        prev.map((j) =>
          String(j.id) === String(data.journeyId) ? { ...j, status: data.status } : j
        )
      );
    };

    socket.on('journey:location', handleLocation);
    socket.on('journey:start', handleStart);
    socket.on('journey:ended', handleEnded);

    return () => {
      socket.off('journey:location', handleLocation);
      socket.off('journey:start', handleStart);
      socket.off('journey:ended', handleEnded);
    };
  }, [socket]);

  const getElapsedTimeText = (startedAt: string, endedAt?: string | null) => {
    try {
      const startTime = new Date(startedAt).getTime();
      const endTime = endedAt ? new Date(endedAt).getTime() : Date.now();
      const diffMs = Math.max(0, endTime - startTime);
      const mins = Math.floor(diffMs / 60000);
      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        return `${hrs}h ${rem}m`;
      }
      return `${Math.max(1, mins)} min`;
    } catch {
      return 'N/A';
    }
  };

  const handleUpdateStatus = async (
    journeyId: string | number,
    newStatus: 'active' | 'deviated' | 'completed' | 'cancelled'
  ) => {
    setUpdatingId(journeyId);
    try {
      const updated = await journeyService.updateStatus(journeyId, newStatus);
      setJourneys((prev) =>
        prev.map((j) => (j.id === journeyId ? { ...j, ...updated, status: newStatus } : j))
      );
      if (selectedJourney && selectedJourney.id === journeyId) {
        setSelectedJourney((prev) => (prev ? { ...prev, ...updated, status: newStatus } : null));
      }
      showToast(`Journey #${journeyId} status updated to '${newStatus.toUpperCase()}'!`);
    } catch (err) {
      console.error('Failed to update journey status:', err);
      showToast(`Failed to update status for Journey #${journeyId}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter journeys
  const filteredJourneys = journeys.filter((j) => {
    const matchesFilter = statusFilter === 'all' || j.status === statusFilter;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (j.userName && j.userName.toLowerCase().includes(query)) ||
      (j.userPhone && j.userPhone.includes(query)) ||
      (j.userEmail && j.userEmail.toLowerCase().includes(query)) ||
      (j.origin?.name && j.origin.name.toLowerCase().includes(query)) ||
      (j.destination?.name && j.destination.name.toLowerCase().includes(query)) ||
      String(j.id).includes(query);

    return matchesFilter && matchesSearch;
  });

  const activeCount = journeys.filter((j) => j.status === 'active').length;
  const deviatedCount = journeys.filter((j) => j.status === 'deviated').length;
  const completedCount = journeys.filter((j) => j.status === 'completed').length;
  const cancelledCount = journeys.filter((j) => j.status === 'cancelled').length;

  const copyTrackingLink = (journeyId: string | number) => {
    const url = `${window.location.origin}/safewalks#journey-${journeyId}`;
    navigator.clipboard.writeText(url);
    showToast(`Tracking link for Session #${journeyId} copied to clipboard!`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" size="sm" pulse>
            ON TRACK
          </Badge>
        );
      case 'deviated':
        return (
          <Badge variant="danger" size="sm" pulse>
            CORRIDOR BREACH
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="info" size="sm">
            SAFELY ARRIVED
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="warning" size="sm">
            CANCELLED
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status.toUpperCase()}
          </Badge>
        );
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 relative max-w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-indigo-400">
          <Sparkles className="w-4 h-4 text-indigo-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Safe Walk Live Operations Radar
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time companion walking corridor tracking, historical walks archive &amp; manual status moderation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="success" pulse>
            <Radio className="w-3 h-3 mr-1 inline" />
            LIVE DISPATCH RADAR
          </Badge>

          {lastRefreshed && (
            <span className="text-[11px] font-mono text-gray-400">
              Refreshed: {lastRefreshed}
            </span>
          )}

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${autoRefresh
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-obsidian-800 border-white/10 text-gray-400'
              }`}
            title="Toggle 15-second automatic radar refresh"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            <span>{autoRefresh ? 'Auto 15s' : 'Auto Paused'}</span>
          </button>

          <button
            onClick={() => loadJourneys(false)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 shadow-lg shadow-indigo-950"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Radar</span>
          </button>
        </div>
      </div>

      {/* Interactive KPI StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className={statusFilter === 'all' ? 'ring-2 ring-indigo-500 rounded-2xl' : ''}>
          <StatCard
            title="Total Walks"
            value={journeys.length}
            subtitle={statusFilter === 'all' ? '● Active filter' : 'All recorded walks'}
            icon={<Footprints className="w-5 h-5 text-indigo-400" />}
            color="indigo"
            onClick={() => setStatusFilter('all')}
          />
        </div>

        <div className={statusFilter === 'active' ? 'ring-2 ring-emerald-500 rounded-2xl' : ''}>
          <StatCard
            title="On Track"
            value={activeCount}
            subtitle={statusFilter === 'active' ? '● Active filter' : 'Currently walking'}
            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
            color="emerald"
            onClick={() => setStatusFilter('active')}
          />
        </div>

        <div className={statusFilter === 'deviated' ? 'ring-2 ring-red-500 rounded-2xl' : ''}>
          <StatCard
            title="Deviated"
            value={deviatedCount}
            subtitle={statusFilter === 'deviated' ? '● Active filter' : 'Corridor breaches'}
            icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
            color="red"
            onClick={() => setStatusFilter('deviated')}
          />
        </div>

        <div className={statusFilter === 'completed' ? 'ring-2 ring-blue-500 rounded-2xl' : ''}>
          <StatCard
            title="Completed"
            value={completedCount}
            subtitle={statusFilter === 'completed' ? '● Active filter' : 'Safely arrived'}
            icon={<CheckCircle className="w-5 h-5 text-blue-400" />}
            color="blue"
            onClick={() => setStatusFilter('completed')}
          />
        </div>

        <div className={statusFilter === 'cancelled' ? 'ring-2 ring-amber-500 rounded-2xl' : ''}>
          <StatCard
            title="Cancelled"
            value={cancelledCount}
            subtitle={statusFilter === 'cancelled' ? '● Active filter' : 'Ended early'}
            icon={<XCircle className="w-5 h-5 text-amber-400" />}
            color="amber"
            onClick={() => setStatusFilter('cancelled')}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-obsidian-850 border border-white/10 flex flex-wrap gap-4 items-center justify-between shadow-xl">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by walker name, phone number, email, or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-obsidian-900 border border-white/10 focus:border-indigo-500 text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${statusFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-obsidian-900 text-gray-400 hover:text-white'
              }`}
          >
            All ({journeys.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-obsidian-900 text-gray-400 hover:text-white'
              }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('deviated')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${statusFilter === 'deviated'
                ? 'bg-red-600 text-white'
                : 'bg-obsidian-900 text-gray-400 hover:text-white'
              }`}
          >
            Breaches ({deviatedCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${statusFilter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-obsidian-900 text-gray-400 hover:text-white'
              }`}
          >
            Completed ({completedCount})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${statusFilter === 'cancelled'
                ? 'bg-amber-600 text-white'
                : 'bg-obsidian-900 text-gray-400 hover:text-white'
              }`}
          >
            Cancelled ({cancelledCount})
          </button>
        </div>
      </div>

      {/* Grid of Safe Walks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-gray-400 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Scanning corridor geofences and active campus escorts...
          </div>
        ) : loadError ? (
          <div className="col-span-full py-16 text-center text-red-400 font-mono text-xs bg-red-950/20 border border-red-900/50 rounded-2xl p-6">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
            <p className="font-semibold">{loadError}</p>
            <button
              onClick={() => loadJourneys(false)}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredJourneys.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 font-mono text-xs bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
            <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-gray-500" />
            No Safe Walks matching your current filter.
          </div>
        ) : (
          filteredJourneys.map((journey) => {
            const isDeviated = journey.status === 'deviated';
            const isCompleted = journey.status === 'completed';
            const isCancelled = journey.status === 'cancelled';
            const isUpdating = updatingId === journey.id;

            return (
              <div
                key={`journey-card-${journey.id}`}
                className={`p-6 rounded-2xl bg-obsidian-850 border transition-all space-y-4 shadow-xl flex flex-col justify-between ${isDeviated
                    ? 'border-red-500/50 ring-1 ring-red-500/30'
                    : isCompleted
                      ? 'border-blue-500/30'
                      : isCancelled
                        ? 'border-amber-500/30'
                        : 'border-white/10 hover:border-indigo-500/40'
                  }`}
              >
                <div className="space-y-4">
                  {/* Top User & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                        <Footprints className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{journey.userName || 'Citizen Walker'}</h3>
                        <span className="text-[10px] font-mono text-gray-400">
                          Session #{journey.id}
                        </span>
                      </div>
                    </div>

                    {getStatusBadge(journey.status)}
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1.5">
                    {journey.userPhone && (
                      <div className="flex items-center justify-between text-xs font-mono text-gray-400 bg-obsidian-900/60 p-2 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{journey.userPhone}</span>
                        </div>
                        <a
                          href={`tel:${journey.userPhone}`}
                          className="px-2 py-0.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors text-[11px] font-semibold"
                        >
                          Call Walker
                        </a>
                      </div>
                    )}
                    {journey.userEmail && (
                      <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-obsidian-900/40 px-2 py-1 rounded-lg border border-white/5 truncate">
                        <Mail className="w-3 h-3 text-gray-500 shrink-0" />
                        <span className="truncate">{journey.userEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Waypoints */}
                  <div className="space-y-3 p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0"></div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-mono text-gray-400 block">Origin</span>
                        <span className="text-white font-medium truncate block">
                          {journey.origin?.name ||
                            `Lat ${journey.origin?.latitude?.toFixed(4)}, Lng ${journey.origin?.longitude?.toFixed(4)}`}
                        </span>
                      </div>
                    </div>

                    <div className="w-0.5 h-3 bg-white/10 ml-1"></div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1 shrink-0"></div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-mono text-gray-400 block">Destination</span>
                        <span className="text-white font-medium truncate block">
                          {journey.destination?.name ||
                            `Lat ${journey.destination?.latitude?.toFixed(4)}, Lng ${journey.destination?.longitude?.toFixed(4)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry info row (Battery, Speed, Ended) */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1">
                    {journey.battery != null && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Battery className="w-3.5 h-3.5" />
                        {journey.battery}%
                      </span>
                    )}
                    {journey.speed != null && (
                      <span className="flex items-center gap-1 text-indigo-400">
                        <Gauge className="w-3.5 h-3.5" />
                        {journey.speed.toFixed(1)} km/h
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {journey.endedAt ? 'Duration: ' : 'Elapsed: '}
                      {getElapsedTimeText(journey.startedAt, journey.endedAt)}
                    </span>
                  </div>

                  {/* Deviation Warning Box */}
                  {isDeviated && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>
                        Walker deviated &gt; 150m from safe walking corridor. Emergency alert sent.
                      </span>
                    </div>
                  )}

                  {/* Quick Edit Status Dropdown */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                      <Edit3 className="w-3 h-3 text-indigo-400" />
                      Change Status:
                    </span>
                    <select
                      value={journey.status}
                      disabled={isUpdating}
                      onChange={(e) =>
                        handleUpdateStatus(
                          journey.id,
                          e.target.value as 'active' | 'deviated' | 'completed' | 'cancelled'
                        )
                      }
                      className="bg-obsidian-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                    >
                      <option value="active">Active (On Track)</option>
                      <option value="deviated">Deviated (Breach)</option>
                      <option value="completed">Completed (Arrived)</option>
                      <option value="cancelled">Cancelled (Aborted)</option>
                    </select>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedJourney(journey)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold text-xs transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View Corridor &amp; Details</span>
                  </button>

                  <button
                    onClick={() => copyTrackingLink(journey.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="Copy Radar Session Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Corridor Map & Dispatch Modal */}
      <Modal
        isOpen={Boolean(selectedJourney)}
        onClose={() => setSelectedJourney(null)}
        title={`Safe Walk Details: ${selectedJourney?.userName || 'Citizen Walker'}`}
        maxWidth="xl"
      >
        {selectedJourney && (
          <div className="space-y-5">
            {/* Status bar */}
            <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl bg-obsidian-900 border border-white/10 gap-3">
              <div className="flex items-center gap-2.5">
                {getStatusBadge(selectedJourney.status)}
                <span className="text-xs font-mono text-gray-400">
                  Session #{selectedJourney.id}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-gray-400">
                  Started: {new Date(selectedJourney.startedAt).toLocaleTimeString()}
                </span>
                {selectedJourney.endedAt && (
                  <span className="text-gray-400">
                    Ended: {new Date(selectedJourney.endedAt).toLocaleTimeString()}
                  </span>
                )}
                <span className="text-indigo-400 font-bold">
                  Duration: {getElapsedTimeText(selectedJourney.startedAt, selectedJourney.endedAt)}
                </span>
              </div>
            </div>

            {/* Walker Details Card */}
            <div className="p-4 rounded-xl bg-obsidian-900 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <span className="text-gray-500 text-[10px] block uppercase">Walker</span>
                <span className="text-white font-bold text-sm block mt-0.5">{selectedJourney.userName || 'Citizen'}</span>
                <span className="text-gray-400 text-[11px]">User ID: #{selectedJourney.userId}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block uppercase">Phone Contact</span>
                <span className="text-indigo-300 font-bold block mt-0.5">{selectedJourney.userPhone || 'Not provided'}</span>
                {selectedJourney.userPhone && (
                  <a
                    href={`tel:${selectedJourney.userPhone}`}
                    className="inline-block mt-1 text-[11px] text-emerald-400 hover:underline"
                  >
                    📞 Click to dial
                  </a>
                )}
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block uppercase">Email Address</span>
                <span className="text-gray-300 block mt-0.5 truncate">{selectedJourney.userEmail || 'N/A'}</span>
              </div>
            </div>

            {/* Corridor Path Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono uppercase text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  Origin Checkpoint
                </div>
                <div className="font-semibold text-white">
                  {selectedJourney.origin?.name || 'Initial Departure Point'}
                </div>
                <div className="font-mono text-gray-400 text-[11px]">
                  {selectedJourney.origin?.latitude?.toFixed(5)}, {selectedJourney.origin?.longitude?.toFixed(5)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold font-mono uppercase text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  Target Destination
                </div>
                <div className="font-semibold text-white">
                  {selectedJourney.destination?.name || 'Arrival Destination'}
                </div>
                <div className="font-mono text-gray-400 text-[11px]">
                  {selectedJourney.destination?.latitude?.toFixed(5)}, {selectedJourney.destination?.longitude?.toFixed(5)}
                </div>
              </div>
            </div>

            {/* Current / Last Known Coordinates */}
            {(selectedJourney.currentLocation || selectedJourney.lastLocation) && (
              <div className="p-3.5 rounded-xl bg-obsidian-900 border border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-300">
                    Last Live GPS: {(selectedJourney.currentLocation || selectedJourney.lastLocation)?.latitude.toFixed(5)}, {(selectedJourney.currentLocation || selectedJourney.lastLocation)?.longitude.toFixed(5)}
                  </span>
                </div>
                {selectedJourney.battery != null && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5" />
                    {selectedJourney.battery}%
                  </span>
                )}
              </div>
            )}

            {/* External Navigation Links */}
            <div className="p-4 rounded-xl bg-obsidian-900 border border-white/10 space-y-3">
              <span className="text-xs font-mono text-gray-400 block font-semibold">
                Direct External Map Dispatch:
              </span>
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${selectedJourney.origin?.latitude},${selectedJourney.origin?.longitude}&destination=${selectedJourney.destination?.latitude},${selectedJourney.destination?.longitude}&travelmode=walking`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-950"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Walking Route on Google Maps</span>
                </a>

                <a
                  href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${selectedJourney.origin?.latitude}%2C${selectedJourney.origin?.longitude}%3B${selectedJourney.destination?.latitude}%2C${selectedJourney.destination?.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors border border-white/10"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open on OpenStreetMap</span>
                </a>
              </div>
            </div>

            {/* Staff Status Intervention Action Bar */}
            <div className="p-4 rounded-xl bg-obsidian-850 border border-indigo-500/30 space-y-2.5">
              <span className="text-xs font-mono text-indigo-300 block font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Staff Status Intervention:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedJourney.id, 'active')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${selectedJourney.status === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-obsidian-900 hover:bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    }`}
                >
                  Mark Active
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedJourney.id, 'deviated')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${selectedJourney.status === 'deviated'
                      ? 'bg-red-600 text-white'
                      : 'bg-obsidian-900 hover:bg-red-950/60 text-red-400 border border-red-500/30'
                    }`}
                >
                  Flag Deviated
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedJourney.id, 'completed')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${selectedJourney.status === 'completed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-obsidian-900 hover:bg-blue-950/60 text-blue-400 border border-blue-500/30'
                    }`}
                >
                  Mark Reached
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedJourney.id, 'cancelled')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${selectedJourney.status === 'cancelled'
                      ? 'bg-amber-600 text-white'
                      : 'bg-obsidian-900 hover:bg-amber-950/60 text-amber-400 border border-amber-500/30'
                    }`}
                >
                  Cancel Walk
                </button>
              </div>
            </div>

            {/* Walker Contact & Close Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              {selectedJourney.userPhone ? (
                <a
                  href={`tel:${selectedJourney.userPhone}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {selectedJourney.userName || 'Walker'} ({selectedJourney.userPhone})</span>
                </a>
              ) : (
                <span className="text-xs font-mono text-gray-500">No direct phone on record</span>
              )}

              <button
                onClick={() => setSelectedJourney(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
