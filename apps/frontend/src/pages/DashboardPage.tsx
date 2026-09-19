import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';
import { sosService } from '../services/sosService';
import { journeyService } from '../services/journeyService';
import { useSocket } from '../context/SocketContext';
import { HazardReport, SosNotification } from '@safora/shared-types';
import { StatCard } from '../components/common/StatCard';
import { LiveCommandMap } from '../components/map/LiveCommandMap';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Flame,
  Footprints,
  AlertTriangle,
  Activity,
  RefreshCw,
  Radio,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SosNotification[]>([]);
  const [activeJourneys, setActiveJourneys] = useState(journeyService.getMockActiveJourneys());
  const [isLoading, setIsLoading] = useState(true);
  const [inspectedPhoto, setInspectedPhoto] = useState<string | null>(null);
  const { activeEmergency, broadcastTestSos } = useSocket();
  const navigate = useNavigate();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedHazards, fetchedSos, journeysRes] = await Promise.all([
        reportService.getReports(100),
        sosService.getNotifications(),
        journeyService.getActiveJourneys(),
      ]);
      setHazards(fetchedHazards);
      setSosAlerts(fetchedSos);
      if (journeysRes?.journeys) {
        setActiveJourneys(journeysRes.journeys);
      }
    } catch (err) {
      console.warn('Could not load operational data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // Poll every 20s
    return () => clearInterval(interval);
  }, []);

  const pendingHazardsCount = hazards.filter((h) => h.status === 'active').length;
  const activeSosCount = sosAlerts.filter((s) => !s.isRead && s.type === 'sos_alert').length;

  return (
    <div className="p-6 space-y-6">
      {/* Top Controls & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Tactical Operations Command
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Geospatial Radar & Incident Monitoring &bull; Dehradun Regional Grid
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => broadcastTestSos(30.3165, 78.0322)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-semibold text-xs transition-colors"
            title="Simulate an emergency SOS broadcast drill on WebSocket"
          >
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span>Simulate SOS Drill</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-obsidian-800 hover:bg-obsidian-700 border border-white/10 text-gray-300 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Grid</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active SOS Beacons"
          value={activeEmergency ? activeSosCount + 1 : activeSosCount}
          subtitle="Awaiting response"
          icon={Flame}
          variant="danger"
          pulse={activeEmergency !== null || activeSosCount > 0}
        />
        <StatCard
          title="Safe Walks in Progress"
          value={activeJourneys.length}
          subtitle="Real-time corridor tracking"
          icon={Footprints}
          variant="indigo"
        />
        <StatCard
          title="Pending Hazard Reports"
          value={pendingHazardsCount}
          subtitle="Awaiting review"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Backend Latency"
          value="42 ms"
          subtitle="PostGIS & Cloudinary active"
          icon={Activity}
          variant="success"
        />
      </div>

      {/* Main Command Center Layout: Map + Real-time Incident Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Central Map Canvas (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase font-mono tracking-wider font-bold text-gray-300">
              Live Geospatial Operations Map
            </h2>
            <span className="text-xs text-indigo-400 font-mono">
              {hazards.length} hazards &bull; {activeJourneys.length} Safe Walks
            </span>
          </div>

          <div className="h-[520px]">
            <LiveCommandMap
              hazards={hazards}
              sosAlerts={sosAlerts}
              onInspectPhoto={(url) => setInspectedPhoto(url)}
              onSelectSos={() => navigate('/sos')}
            />
          </div>
        </div>

        {/* Sidebar Feed: High Priority Alerts & Quick Action Queue (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase font-mono tracking-wider font-bold text-gray-300">
              Priority Incident Queue
            </h2>
            <button
              onClick={() => navigate('/sos')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {/* Active WebSocket Inbound if any */}
            {activeEmergency && (
              <div className="p-4 rounded-xl bg-red-950/60 border-2 border-red-500 text-white space-y-2 animate-pulse-slow shadow-lg">
                <div className="flex items-center justify-between">
                  <Badge variant="danger" pulse>LIVE SOS BEACON</Badge>
                  <span className="text-[10px] font-mono text-red-300">NOW</span>
                </div>
                <div className="font-bold text-sm">{activeEmergency.userName || 'Citizen in Distress'}</div>
                <div className="text-xs text-red-200 font-mono">
                  GPS: {activeEmergency.latitude.toFixed(4)}, {activeEmergency.longitude.toFixed(4)}
                </div>
                <button
                  onClick={() => navigate('/sos')}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
                >
                  Open Dispatch Queue
                </button>
              </div>
            )}

            {/* Inbound SOS List */}
            {sosAlerts.slice(0, 3).map((sos) => (
              <div
                key={`sos-card-${sos.id}`}
                className="p-4 rounded-xl bg-obsidian-800/80 border border-red-500/30 hover:border-red-500/60 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="danger" size="sm">SOS ALERT</Badge>
                  <span className="text-[10px] font-mono text-gray-400">
                    {sos.createdAt ? new Date(sos.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>
                <div className="font-semibold text-sm text-white">{sos.senderName}</div>
                <p className="text-xs text-gray-300 line-clamp-2">{sos.body}</p>
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-gray-400">
                  <span className="font-mono">Battery: {sos.batteryPercentage || 85}%</span>
                  <button
                    onClick={() => navigate('/sos')}
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Respond &rarr;
                  </button>
                </div>
              </div>
            ))}

            {/* Recent High-Severity Hazards */}
            {hazards
              .filter((h) => h.severity >= 3)
              .slice(0, 4)
              .map((h) => (
                <div
                  key={`hazard-card-${h.id}`}
                  className="p-4 rounded-xl bg-obsidian-800/80 border border-white/10 hover:border-white/20 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={h.status === 'active' ? 'warning' : 'success'} size="sm">
                      {h.category.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Sev {h.severity}/5
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-white">{h.title}</div>
                  {h.description && (
                    <p className="text-xs text-gray-400 line-clamp-1">{h.description}</p>
                  )}
                  {h.photoUrl && (
                    <button
                      onClick={() => setInspectedPhoto(h.photoUrl!)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium pt-1"
                    >
                      <span>View Photo Evidence</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Photo Inspector Modal */}
      <Modal
        isOpen={Boolean(inspectedPhoto)}
        onClose={() => setInspectedPhoto(null)}
        title="Hazard Evidence Photo"
        maxWidth="2xl"
      >
        {inspectedPhoto && (
          <div className="space-y-4">
            <img
              src={inspectedPhoto}
              alt="Hazard Evidence"
              className="w-full max-h-[65vh] object-contain rounded-xl border border-white/10 bg-black/50"
            />
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>Verified Cloudinary Media Vault asset</span>
              <a
                href={inspectedPhoto}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                Open Original in New Tab <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
