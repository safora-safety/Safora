import React, { useState, useEffect } from 'react';
import { journeyService, ActiveJourney } from '../services/journeyService';
import { Badge } from '../components/common/Badge';
import {
  Footprints,
  Navigation,
  Clock,
  AlertTriangle,
  RefreshCw,
  Phone,
  ShieldCheck,
  Radio,
} from 'lucide-react';

export const SafeWalksPage: React.FC = () => {
  const [journeys, setJourneys] = useState<ActiveJourney[]>([]);
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const loadJourneys = async () => {
    setIsLoading(true);
    try {
      const result = await journeyService.getActiveJourneys();
      setJourneys(result.journeys);
      setIsLiveStream(result.isLive);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load active journeys:', err);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Safe Walk Live Radar
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time companion walking corridor tracking &amp; 150m deviation detection
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={isLiveStream ? 'success' : 'purple'} pulse>
            <Radio className="w-3 h-3 mr-1 inline" />
            {isLiveStream ? 'LIVE DISPATCH STREAM' : 'RADAR SIMULATION'}
          </Badge>

          <Badge variant="purple">
            {journeys.filter((j) => j.status === 'active').length} ACTIVE ESCORTS
          </Badge>

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

      {/* Grid of Active Safe Walks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && journeys.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Scanning corridor geofences and active campus escorts...
          </div>
        ) : journeys.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 font-mono text-xs">
            No active walks or companion sessions currently in progress.
          </div>
        ) : (
          journeys.map((journey) => {
            const isDeviated = journey.status === 'deviated';

            return (
              <div
                key={`journey-card-${journey.id}`}
                className={`p-6 rounded-2xl bg-obsidian-850 border transition-all space-y-4 shadow-xl ${
                  isDeviated
                    ? 'border-red-500/50 ring-1 ring-red-500/30'
                    : 'border-white/10 hover:border-indigo-500/40'
                }`}
              >
                {/* Top User & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <Footprints className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{journey.userName}</h3>
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
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{journey.userPhone}</span>
                  </div>
                )}

                {/* Waypoints */}
                <div className="space-y-3 p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0"></div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-gray-400 block">Origin</span>
                      <span className="text-white font-medium">
                        {journey.origin.name || `Lat ${journey.origin.latitude.toFixed(3)}, Lng ${journey.origin.longitude.toFixed(3)}`}
                      </span>
                    </div>
                  </div>

                  <div className="w-0.5 h-4 bg-white/10 ml-1"></div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1 shrink-0"></div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-gray-400 block">Destination</span>
                      <span className="text-white font-medium">
                        {journey.destination.name || `Lat ${journey.destination.latitude.toFixed(3)}, Lng ${journey.destination.longitude.toFixed(3)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deviation Warning Box if applicable */}
                {isDeviated && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      User deviated &gt; 150m from safe walking corridor. Trusted contacts alerted.
                    </span>
                  </div>
                )}

                {/* Telemetry Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    Elapsed: {getElapsedTimeMins(journey.startedAt)}
                  </span>
                  <span className="text-indigo-400 font-semibold">
                    ETA: ~{journey.expectedDurationMins || 15} min
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
