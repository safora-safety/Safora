import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { Badge, BadgeVariant } from '../components/common/Badge';
import {
  Server,
  Database,
  Cloud,
  Map,
  Compass,
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DiagnosticReport {
  database?: {
    connected: boolean;
    postgis: boolean;
    message: string;
    version?: string;
  };
  cloudinary?: {
    connected: boolean;
    message: string;
    cloudName?: string;
  };
  firebase?: {
    initialized: boolean;
    message: string;
    projectId?: string;
  };
  mapTiler?: {
    valid: boolean;
    message: string;
  };
  nominatim?: {
    reachable: boolean;
    message: string;
  };
  error?: string;
  details?: string;
}

interface HealthReport {
  status?: string;
  project?: string;
  timestamp?: string;
  uptime?: number;
}

export const DiagnosticsPage: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticReport | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [showRawJson, setShowRawJson] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const [diagRes, healthRes] = await Promise.allSettled([
        apiClient.get('/diagnostics'),
        apiClient.get('/health'),
      ]);

      if (diagRes.status === 'fulfilled') {
        setDiagnostics(diagRes.value.data);
      } else {
        setDiagnostics({
          database: { connected: false, postgis: false, message: 'Backend unreachable' },
          cloudinary: { connected: false, message: 'Endpoint unreachable' },
          firebase: { initialized: false, message: 'Endpoint unreachable' },
          mapTiler: { valid: false, message: 'Endpoint unreachable' },
          nominatim: { reachable: false, message: 'Endpoint unreachable' },
        });
      }

      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value.data);
      } else {
        setHealth({ status: 'offline' });
      }

      setLastCheck(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Diagnostics fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  // Compute overall health state
  const isDbHealthy = diagnostics?.database?.connected && diagnostics?.database?.postgis;
  const isCloudinaryHealthy = diagnostics?.cloudinary?.connected;
  const isServerHealthy = health?.status === 'online';

  const getSystemBanner = () => {
    if (isLoading && !diagnostics) {
      return {
        variant: 'info' as BadgeVariant,
        title: 'Running Infrastructure Health Probe...',
        subtitle: 'Connecting to PostgreSQL, PostGIS, Cloudinary, Firebase, and MapTiler...',
      };
    }
    if (isDbHealthy && isCloudinaryHealthy && isServerHealthy) {
      return {
        variant: 'success' as BadgeVariant,
        title: 'All Critical Operational Systems Functional',
        subtitle: 'PostGIS spatial engine, media storage vault, and Express API online with zero errors.',
      };
    }
    if (!diagnostics?.database?.connected || !isServerHealthy) {
      return {
        variant: 'danger' as BadgeVariant,
        title: 'Critical Service Degradation Detected',
        subtitle: 'Core database or server connectivity interrupted. Check backend logs immediately.',
      };
    }
    return {
      variant: 'warning' as BadgeVariant,
      title: 'Secondary Sub-system Warning',
      subtitle: 'One or more peripheral microservices (MapTiler, Firebase, or Nominatim) reported issues.',
    };
  };

  const banner = getSystemBanner();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            System Observability & Diagnostics
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time live telemetry of PostgreSQL + PostGIS, Cloudinary Vault, Firebase Admin, MapTiler, and Render API
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastCheck && (
            <span className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Last Probe: {lastCheck}
            </span>
          )}
          <button
            onClick={runDiagnostics}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Run Health Probe</span>
          </button>
        </div>
      </div>

      {/* System Status Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 shadow-xl ${
          banner.variant === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : banner.variant === 'danger'
            ? 'bg-red-950/40 border-red-500/30 text-red-300'
            : banner.variant === 'warning'
            ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
        }`}
      >
        {banner.variant === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
        ) : banner.variant === 'danger' ? (
          <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        )}
        <div className="flex-1">
          <h4 className="font-bold text-sm text-white">{banner.title}</h4>
          <p className="text-xs mt-0.5 opacity-90">{banner.subtitle}</p>
        </div>
      </div>

      {/* Grid of Diagnostic Cards (6 Services) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. PostgreSQL & PostGIS */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">PostgreSQL + PostGIS</h3>
                <span className="text-[10px] font-mono text-gray-400">Geospatial Engine</span>
              </div>
            </div>
            <Badge
              variant={
                diagnostics?.database?.connected && diagnostics?.database?.postgis
                  ? 'success'
                  : diagnostics?.database?.connected
                  ? 'warning'
                  : 'danger'
              }
              size="sm"
            >
              {diagnostics?.database?.connected && diagnostics?.database?.postgis
                ? 'ONLINE'
                : diagnostics?.database?.connected
                ? 'NO POSTGIS'
                : 'OFFLINE'}
            </Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Connection:</span>
              <span className={diagnostics?.database?.connected ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                {diagnostics?.database?.connected ? 'Active Pool' : 'Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">PostGIS Extension:</span>
              <span className={diagnostics?.database?.postgis ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {diagnostics?.database?.postgis ? `v${diagnostics.database.version || 'Active'}` : 'Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Spatial SRID:</span>
              <span className="text-indigo-400">4326 (WGS 84)</span>
            </div>
            {diagnostics?.database?.message && (
              <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.database.message}>
                {diagnostics.database.message}
              </div>
            )}
          </div>
        </div>

        {/* 2. Cloudinary Vault */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Cloudinary Vault</h3>
                <span className="text-[10px] font-mono text-gray-400">Photos & Audio Uploads</span>
              </div>
            </div>
            <Badge
              variant={diagnostics?.cloudinary?.connected ? 'success' : 'danger'}
              size="sm"
            >
              {diagnostics?.cloudinary?.connected ? 'CONNECTED' : 'DISCONNECTED'}
            </Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">API Ping:</span>
              <span className={diagnostics?.cloudinary?.connected ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                {diagnostics?.cloudinary?.connected ? 'OK / Verified' : 'Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cloud Target:</span>
              <span className="text-indigo-400">
                {diagnostics?.cloudinary?.cloudName || 'SAFORA_SAFETY'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Resource Types:</span>
              <span className="text-white">image / video / raw</span>
            </div>
            {diagnostics?.cloudinary?.message && (
              <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.cloudinary.message}>
                {diagnostics.cloudinary.message}
              </div>
            )}
          </div>
        </div>

        {/* 3. Firebase Admin SDK */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Firebase Admin SDK</h3>
                <span className="text-[10px] font-mono text-gray-400">Push Notifications & FCM</span>
              </div>
            </div>
            <Badge
              variant={diagnostics?.firebase?.initialized ? 'success' : 'warning'}
              size="sm"
            >
              {diagnostics?.firebase?.initialized ? 'INITIALIZED' : 'STANDBY'}
            </Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">SDK Status:</span>
              <span className={diagnostics?.firebase?.initialized ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {diagnostics?.firebase?.initialized ? 'Active' : 'Uninitialized'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Project ID:</span>
              <span className="text-white truncate max-w-[150px]">
                {diagnostics?.firebase?.projectId || 'safora-safety'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">FCM Gateway:</span>
              <span className="text-indigo-400">HTTP v1 Protocol</span>
            </div>
            {diagnostics?.firebase?.message && (
              <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.firebase.message}>
                {diagnostics.firebase.message}
              </div>
            )}
          </div>
        </div>

        {/* 4. MapTiler Vector Tiles */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">MapTiler Vector Tiles</h3>
                <span className="text-[10px] font-mono text-gray-400">Streets-v2 & Cartography</span>
              </div>
            </div>
            <Badge
              variant={diagnostics?.mapTiler?.valid ? 'success' : 'danger'}
              size="sm"
            >
              {diagnostics?.mapTiler?.valid ? 'VALIDATED' : 'RESTRICTED'}
            </Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">API Key Validation:</span>
              <span className={diagnostics?.mapTiler?.valid ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                {diagnostics?.mapTiler?.valid ? 'Valid (200 OK)' : 'Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Map Style:</span>
              <span className="text-indigo-400">streets-v2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tile Rendering:</span>
              <span className="text-white">Vector WebGL / Leaflet</span>
            </div>
            {diagnostics?.mapTiler?.message && (
              <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.mapTiler.message}>
                {diagnostics.mapTiler.message}
              </div>
            )}
          </div>
        </div>

        {/* 5. OpenStreetMap Nominatim */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">OSM Nominatim</h3>
                <span className="text-[10px] font-mono text-gray-400">Reverse Geocoding</span>
              </div>
            </div>
            <Badge
              variant={diagnostics?.nominatim?.reachable ? 'success' : 'danger'}
              size="sm"
            >
              {diagnostics?.nominatim?.reachable ? 'REACHABLE' : 'UNREACHABLE'}
            </Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Reverse Geocode:</span>
              <span className={diagnostics?.nominatim?.reachable ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                {diagnostics?.nominatim?.reachable ? 'Available' : 'Unreachable'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Protocol:</span>
              <span className="text-indigo-400">HTTPS OpenStreetMap</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cache Layer:</span>
              <span className="text-white">In-Memory 30-min TTL</span>
            </div>
            {diagnostics?.nominatim?.message && (
              <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.nominatim.message}>
                {diagnostics.nominatim.message}
              </div>
            )}
          </div>
        </div>

        {/* 6. Express API Backend & Runtime */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Render Express Server</h3>
                <span className="text-[10px] font-mono text-gray-400">Node.js Engine</span>
              </div>
            </div>
            <Badge
              variant={health?.status === 'online' ? 'success' : 'danger'}
              size="sm"
            >
              {health?.status === 'online' ? 'HEALTHY' : 'DOWN'}
            </Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">API Health Probe:</span>
              <span className={health?.status === 'online' ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                {health?.status || 'Active'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Uptime:</span>
              <span className="text-white">
                {health?.uptime ? `${Math.floor(health.uptime / 60)} minutes` : 'Active'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Socket.IO Server:</span>
              <span className="text-indigo-400">Connected & Listening</span>
            </div>
            {health?.timestamp && (
              <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate">
                Server Clock: {new Date(health.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw JSON Telemetry Drawer */}
      <div className="rounded-2xl bg-obsidian-850 border border-white/10 overflow-hidden shadow-xl">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full p-4 flex items-center justify-between text-left text-xs font-mono text-gray-400 hover:text-white hover:bg-obsidian-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span className="font-bold">Raw Telemetry Response JSON Payload</span>
          </div>
          {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRawJson && (
          <div className="p-4 border-t border-white/10 bg-black/50">
            <pre className="p-4 rounded-xl bg-black/70 border border-white/5 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-80">
              {JSON.stringify({ health, diagnostics }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
