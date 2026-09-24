import React, { useState, useEffect } from 'react';
import { journeyService, ActiveJourney } from '../services/journeyService';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import {
  Footprints,
  Navigation,
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
  Copy,
  Sparkles,
  Search,
} from 'lucide-react';

export const SafeWalksPage: React.FC = () => {
  const [journeys, setJourneys] = useState<ActiveJourney[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deviated'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Corridor Detail Modal State
  const [selectedJourney, setSelectedJourney] = useState<ActiveJourney | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadJourneys = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await journeyService.getActiveJourneys();
      setJourneys(result);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load active journeys:', err);
      setLoadError("Couldn't load active Safe Walks. Please verify connection to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJourneys();
  }, []);

  const getElapsedTimeMins = (startedAt: string) => {
    try {
      const diffMs = Date.now() - new Date(startedAt).getTime();
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      return `${mins} min`;
    } catch {
      return 'Active';
    }
  };

  // Filter journeys
  const filteredJourneys = journeys.filter((j) => {
    const matchesFilter =
      statusFilter === 'all' ||
      (statusFilter === 'active' && j.status === 'active') ||
      (statusFilter === 'deviated' && j.status === 'deviated');

    const matchesSearch =
      !searchQuery ||
      (j.userName && j.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (j.userPhone && j.userPhone.includes(searchQuery)) ||
      (j.origin.name && j.origin.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (j.destination.name && j.destination.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const activeCount = journeys.filter((j) => j.status === 'active').length;
  const deviatedCount = journeys.filter((j) => j.status === 'deviated').length;

  const copyTrackingLink = (journeyId: string | number) => {
    const url = `${window.location.origin}/safewalks#journey-${journeyId}`;
    navigator.clipboard.writeText(url);
    showToast(`Tracking link for Session #${journeyId} copied to clipboard!`);
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
            Safe Walk Live Radar
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time companion walking corridor tracking &amp; 150m deviation detection
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
            onClick={loadJourneys}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Radar</span>
          </button>
        </div>
      </div>

      {/* Interactive KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className={statusFilter === 'all' ? 'ring-2 ring-indigo-500 rounded-2xl' : ''}>
          <StatCard
            title="Total Active Safe Walks"
            value={journeys.length}
            subtitle={statusFilter === 'all' ? '● Showing all walks' : 'Click to show all'}
            icon={<Footprints className="w-5 h-5 text-indigo-400" />}
            color="indigo"
            onClick={() => setStatusFilter('all')}
          />
        </div>

        <div className={statusFilter === 'active' ? 'ring-2 ring-emerald-500 rounded-2xl' : ''}>
          <StatCard
            title="On Track in Corridor"
            value={activeCount}
            subtitle={statusFilter === 'active' ? '● Filtered on track' : 'Click to filter on track'}
            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
            color="emerald"
            onClick={() => setStatusFilter('active')}
          />
        </div>

        <div className={statusFilter === 'deviated' ? 'ring-2 ring-red-500 rounded-2xl' : ''}>
          <StatCard
            title="Corridor Deviations (>150m)"
            value={deviatedCount}
            subtitle={statusFilter === 'deviated' ? '● Filtered deviations' : 'Click to view breaches'}
            icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
            color="red"
            onClick={() => setStatusFilter('deviated')}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-obsidian-850 border border-white/10 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by walker name, phone number, or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-obsidian-900 border border-white/10 focus:border-indigo-500 text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-obsidian-900 text-gray-400 hover:text-white'
            }`}
          >
            All ({journeys.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-obsidian-900 text-gray-400 hover:text-white'
            }`}
          >
            On Track ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('deviated')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'deviated'
                ? 'bg-red-600 text-white'
                : 'bg-obsidian-900 text-gray-400 hover:text-white'
            }`}
          >
            Breaches ({deviatedCount})
          </button>
        </div>
      </div>

      {/* Grid of Active Safe Walks */}
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
              onClick={loadJourneys}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredJourneys.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 font-mono text-xs bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
            <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-gray-500" />
            No active Safe Walks matching your current filters.
          </div>
        ) : (
          filteredJourneys.map((journey) => {
            const isDeviated = journey.status === 'deviated';

            return (
              <div
                key={`journey-card-${journey.id}`}
                className={`p-6 rounded-2xl bg-obsidian-850 border transition-all space-y-4 shadow-xl flex flex-col justify-between ${
                  isDeviated
                    ? 'border-red-500/50 ring-1 ring-red-500/30'
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

                    <Badge
                      variant={isDeviated ? 'danger' : 'success'}
                      size="sm"
                      pulse={isDeviated}
                    >
                      {isDeviated ? 'CORRIDOR BREACH' : 'ON TRACK'}
                    </Badge>
                  </div>

                  {/* Contact phone if available */}
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

                  {/* Waypoints */}
                  <div className="space-y-3 p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0"></div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-mono text-gray-400 block">Origin</span>
                        <span className="text-white font-medium truncate block">
                          {journey.origin.name ||
                            `Lat ${journey.origin.latitude.toFixed(4)}, Lng ${journey.origin.longitude.toFixed(4)}`}
                        </span>
                      </div>
                    </div>

                    <div className="w-0.5 h-3 bg-white/10 ml-1"></div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1 shrink-0"></div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-mono text-gray-400 block">Destination</span>
                        <span className="text-white font-medium truncate block">
                          {journey.destination.name ||
                            `Lat ${journey.destination.latitude.toFixed(4)}, Lng ${journey.destination.longitude.toFixed(4)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deviation Warning Box if applicable */}
                  {isDeviated && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>
                        Walker deviated &gt; 150m from safe walking corridor. Emergency alert sent.
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions & Telemetry Footer */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      Elapsed: {getElapsedTimeMins(journey.startedAt)}
                    </span>
                    <span className="text-indigo-400 font-semibold">
                      ETA: ~{journey.expectedDurationMins || 15} min
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedJourney(journey)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold text-xs transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>View Corridor</span>
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
              </div>
            );
          })
        )}
      </div>

      {/* Corridor Map & Dispatch Modal */}
      <Modal
        isOpen={Boolean(selectedJourney)}
        onClose={() => setSelectedJourney(null)}
        title={`Corridor Radar: ${selectedJourney?.userName || 'Citizen Walker'}`}
        maxWidth="xl"
      >
        {selectedJourney && (
          <div className="space-y-5">
            {/* Status bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/10">
              <div className="flex items-center gap-2">
                <Badge
                  variant={selectedJourney.status === 'deviated' ? 'danger' : 'success'}
                  pulse={selectedJourney.status === 'deviated'}
                >
                  {selectedJourney.status === 'deviated' ? 'BREACH DETECTED' : 'CORRIDOR ACTIVE'}
                </Badge>
                <span className="text-xs font-mono text-gray-400">
                  Session #{selectedJourney.id}
                </span>
              </div>
              <span className="text-xs font-mono text-indigo-400">
                Elapsed: {getElapsedTimeMins(selectedJourney.startedAt)}
              </span>
            </div>

            {/* Corridor Path Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono uppercase text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  Origin
                </div>
                <div className="font-semibold text-white">
                  {selectedJourney.origin.name || 'Initial Departure Point'}
                </div>
                <div className="font-mono text-gray-400 text-[11px]">
                  {selectedJourney.origin.latitude.toFixed(5)}, {selectedJourney.origin.longitude.toFixed(5)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold font-mono uppercase text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  Destination
                </div>
                <div className="font-semibold text-white">
                  {selectedJourney.destination.name || 'Arrival Destination'}
                </div>
                <div className="font-mono text-gray-400 text-[11px]">
                  {selectedJourney.destination.latitude.toFixed(5)}, {selectedJourney.destination.longitude.toFixed(5)}
                </div>
              </div>
            </div>

            {/* External Navigation Links */}
            <div className="p-4 rounded-xl bg-obsidian-900 border border-white/10 space-y-3">
              <span className="text-xs font-mono text-gray-400 block font-semibold">
                Direct External Map Dispatch:
              </span>
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${selectedJourney.origin.latitude},${selectedJourney.origin.longitude}&destination=${selectedJourney.destination.latitude},${selectedJourney.destination.longitude}&travelmode=walking`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Walking Route on Google Maps</span>
                </a>

                <a
                  href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${selectedJourney.origin.latitude}%2C${selectedJourney.origin.longitude}%3B${selectedJourney.destination.latitude}%2C${selectedJourney.destination.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors border border-white/10"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open on OpenStreetMap</span>
                </a>
              </div>
            </div>

            {/* Walker Contact & Interventions */}
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
