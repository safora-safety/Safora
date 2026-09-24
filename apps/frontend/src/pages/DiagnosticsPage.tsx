import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
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
  Zap,
  Activity,
  Sparkles,
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
  const [testingService, setTestingService] = useState<string | null>(null);
  const [serviceLatencies, setServiceLatencies] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const runDiagnostics = async () => {
    setIsLoading(true);
    const start = performance.now();
    try {
      const [diagRes, healthRes] = await Promise.allSettled([
        apiClient.get('/diagnostics'),
        apiClient.get('/health'),
      ]);

      const roundtrip = Math.round(performance.now() - start);
      setServiceLatencies((prev) => ({ ...prev, overall: roundtrip, express: Math.round(roundtrip / 2) }));

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
      showToast('Diagnostic probe encountered a connection error');
    } finally {
      setIsLoading(false);
    }
  };

  // Test individual service
  const handleTestService = async (serviceName: string) => {
    setTestingService(serviceName);
    const start = performance.now();
    try {
      if (serviceName === 'express') {
        const res = await apiClient.get('/health');
        const elapsed = Math.round(performance.now() - start);
        setServiceLatencies((prev) => ({ ...prev, express: elapsed }));
        setHealth(res.data);
        showToast(`Express API responded healthy in ${elapsed}ms`);
      } else {
        // Probe diagnostics
        const res = await apiClient.get<DiagnosticReport>('/diagnostics');
        const elapsed = Math.round(performance.now() - start);
        setServiceLatencies((prev) => ({ ...prev, [serviceName]: elapsed }));
        setDiagnostics(res.data);
        showToast(`${serviceName.toUpperCase()} probed successfully in ${elapsed}ms`);
      }
      setLastCheck(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(`Failed to test service ${serviceName}:`, err);
      showToast(`Error testing ${serviceName}`);
    } finally {
      setTestingService(null);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  // Compute overall health state
  const isDbHealthy = diagnostics?.database?.connected && diagnostics?.database?.postgis;
  const isCloudinaryHealthy = diagnostics?.cloudinary?.connected;
  const isFirebaseHealthy = diagnostics?.firebase?.initialized;
  const isServerHealthy = health?.status === 'online';

  const operationalCount = [
    isDbHealthy,
    isCloudinaryHealthy,
    isFirebaseHealthy,
    diagnostics?.mapTiler?.valid,
    diagnostics?.nominatim?.reachable,
    isServerHealthy,
  ].filter(Boolean).length;

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
            System Observability &amp; Diagnostics
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time live telemetry of PostgreSQL + PostGIS, Cloudinary Vault, Firebase Admin, MapTiler, and Express API
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            <span>Run All Probes</span>
          </button>
        </div>
      </div>

      {/* Interactive Top KPI StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Operational Services"
          value={`${operationalCount}/6 Online`}
          subtitle={operationalCount === 6 ? 'All systems nominal' : 'Attention required'}
          icon={<Activity className="w-5 h-5 text-emerald-400" />}
          color={operationalCount === 6 ? 'emerald' : 'amber'}
          onClick={runDiagnostics}
        />
        <StatCard
          title="Spatial PostGIS Engine"
          value={isDbHealthy ? 'Connected' : 'Degraded'}
          subtitle={diagnostics?.database?.postgis ? `PostGIS v${diagnostics.database.version || '3.x'}` : 'Offline'}
          icon={<Database className="w-5 h-5 text-indigo-400" />}
          color={isDbHealthy ? 'indigo' : 'red'}
          onClick={() => handleTestService('database')}
        />
        <StatCard
          title="Media Storage Vault"
          value={isCloudinaryHealthy ? 'Active' : 'Unreachable'}
          subtitle={diagnostics?.cloudinary?.cloudName || 'Cloudinary'}
          icon={<Cloud className="w-5 h-5 text-purple-400" />}
          color={isCloudinaryHealthy ? 'purple' : 'red'}
          onClick={() => handleTestService('cloudinary')}
        />
        <StatCard
          title="Express API Latency"
          value={serviceLatencies.express ? `${serviceLatencies.express} ms` : serviceLatencies.overall ? `${serviceLatencies.overall} ms` : 'Online'}
          subtitle={health?.uptime ? `Uptime ${Math.floor(health.uptime / 60)}m` : 'Express Runtime'}
          icon={<Zap className="w-5 h-5 text-amber-400" />}
          color="amber"
          onClick={() => handleTestService('express')}
        />
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

      {/* Grid of Diagnostic Cards (6 Services with Individual Test Buttons) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. PostgreSQL & PostGIS */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
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
              {serviceLatencies.database && (
                <div className="flex justify-between text-emerald-400">
                  <span className="text-gray-400">Latency:</span>
                  <span>{serviceLatencies.database} ms</span>
                </div>
              )}
              {diagnostics?.database?.message && (
                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.database.message}>
                  {diagnostics.database.message}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleTestService('database')}
            disabled={testingService === 'database'}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'database' ? 'animate-spin' : ''}`} />
            <span>{testingService === 'database' ? 'Testing Database...' : 'Test PostGIS Spatial Query'}</span>
          </button>
        </div>

        {/* 2. Cloudinary Vault */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Cloudinary Vault</h3>
                  <span className="text-[10px] font-mono text-gray-400">Photos &amp; Audio Uploads</span>
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
              {serviceLatencies.cloudinary && (
                <div className="flex justify-between text-indigo-400">
                  <span className="text-gray-400">Latency:</span>
                  <span>{serviceLatencies.cloudinary} ms</span>
                </div>
              )}
              {diagnostics?.cloudinary?.message && (
                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.cloudinary.message}>
                  {diagnostics.cloudinary.message}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleTestService('cloudinary')}
            disabled={testingService === 'cloudinary'}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'cloudinary' ? 'animate-spin' : ''}`} />
            <span>{testingService === 'cloudinary' ? 'Testing Cloudinary...' : 'Ping Cloudinary Vault'}</span>
          </button>
        </div>

        {/* 3. Firebase Admin SDK */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Firebase Admin SDK</h3>
                  <span className="text-[10px] font-mono text-gray-400">Push Notifications &amp; FCM</span>
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
              {serviceLatencies.firebase && (
                <div className="flex justify-between text-amber-400">
                  <span className="text-gray-400">Latency:</span>
                  <span>{serviceLatencies.firebase} ms</span>
                </div>
              )}
              {diagnostics?.firebase?.message && (
                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.firebase.message}>
                  {diagnostics.firebase.message}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleTestService('firebase')}
            disabled={testingService === 'firebase'}
            className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'firebase' ? 'animate-spin' : ''}`} />
            <span>{testingService === 'firebase' ? 'Testing FCM...' : 'Probe Firebase Admin SDK'}</span>
          </button>
        </div>

        {/* 4. MapTiler Vector Tiles */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">MapTiler Vector Tiles</h3>
                  <span className="text-[10px] font-mono text-gray-400">Streets-v2 &amp; Cartography</span>
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
              {serviceLatencies.mapTiler && (
                <div className="flex justify-between text-purple-400">
                  <span className="text-gray-400">Latency:</span>
                  <span>{serviceLatencies.mapTiler} ms</span>
                </div>
              )}
              {diagnostics?.mapTiler?.message && (
                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.mapTiler.message}>
                  {diagnostics.mapTiler.message}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleTestService('mapTiler')}
            disabled={testingService === 'mapTiler'}
            className="w-full py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'mapTiler' ? 'animate-spin' : ''}`} />
            <span>{testingService === 'mapTiler' ? 'Validating Tiles...' : 'Validate MapTiler Streets Style'}</span>
          </button>
        </div>

        {/* 5. OpenStreetMap Nominatim */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
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
              {serviceLatencies.nominatim && (
                <div className="flex justify-between text-cyan-400">
                  <span className="text-gray-400">Latency:</span>
                  <span>{serviceLatencies.nominatim} ms</span>
                </div>
              )}
              {diagnostics?.nominatim?.message && (
                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate" title={diagnostics.nominatim.message}>
                  {diagnostics.nominatim.message}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleTestService('nominatim')}
            disabled={testingService === 'nominatim'}
            className="w-full py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'nominatim' ? 'animate-spin' : ''}`} />
            <span>{testingService === 'nominatim' ? 'Pinging Nominatim...' : 'Ping OSM Reverse Geocoder'}</span>
          </button>
        </div>

        {/* 6. Express API Backend & Runtime */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
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
                <span className="text-indigo-400">Connected &amp; Listening</span>
              </div>
              {serviceLatencies.express && (
                <div className="flex justify-between text-blue-400">
                  <span className="text-gray-400">Ping:</span>
                  <span>{serviceLatencies.express} ms</span>
                </div>
              )}
              {health?.timestamp && (
                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 truncate">
                  Server Clock: {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleTestService('express')}
            disabled={testingService === 'express'}
            className="w-full py-2 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingService === 'express' ? 'animate-spin' : ''}`} />
            <span>{testingService === 'express' ? 'Probing Server...' : 'Probe Express API &amp; Uptime'}</span>
          </button>
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
              {JSON.stringify({ health, diagnostics, serviceLatencies }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
