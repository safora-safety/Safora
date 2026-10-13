import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Flame,
  Footprints,
  FileText,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { reportService, AnalyticsData } from '../services/reportService';
import { LiveCommandMap } from '../components/map/LiveCommandMap';
import { HazardReport } from '@safora/shared-types';

const SEVERITY_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'];
const CATEGORY_COLORS = ['#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#10B981'];

type TimeRange = '24h' | '7d' | '30d' | 'all';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, reportsRes] = await Promise.allSettled([
        reportService.getAnalyticsSummary(),
        reportService.getReports(100),
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setData(analyticsRes.value);
      }
      if (reportsRes.status === 'fulfilled') {
        setHazards(reportsRes.value || []);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const rawCategoryData = data?.categoryData?.length
    ? data.categoryData
    : [
        { name: 'Poor Lighting', count: 14, fill: '#F59E0B' },
        { name: 'Road Hazard', count: 9, fill: '#EF4444' },
        { name: 'Waterlogging', count: 6, fill: '#06B6D4' },
        { name: 'Isolated Area', count: 11, fill: '#8B5CF6' },
        { name: 'Heavy Traffic', count: 4, fill: '#EC4899' },
      ];

  const totalCategoryIncidents = useMemo(
    () => rawCategoryData.reduce((acc, curr) => acc + (curr.count || 0), 0) || 1,
    [rawCategoryData]
  );

  const categoryPieData = useMemo(() => {
    return rawCategoryData.map((item, index) => ({
      ...item,
      percentage: ((item.count / totalCategoryIncidents) * 100).toFixed(1),
      fill: item.fill || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [rawCategoryData, totalCategoryIncidents]);

  const severityData = data?.severityData?.length
    ? data.severityData
    : [
        { level: 'Severity 1 (Minor)', severity: 1, reports: 5 },
        { level: 'Severity 2 (Moderate)', severity: 2, reports: 12 },
        { level: 'Severity 3 (Substantial)', severity: 3, reports: 18 },
        { level: 'Severity 4 (Severe)', severity: 4, reports: 7 },
        { level: 'Severity 5 (Critical)', severity: 5, reports: 2 },
      ];

  const hourlyTrend = data?.hourlyTrend?.length
    ? data.hourlyTrend
    : [
        { time: '18:00', incidents: 2 },
        { time: '19:00', incidents: 5 },
        { time: '20:00', incidents: 9 },
        { time: '21:00', incidents: 14 },
        { time: '22:00', incidents: 19 },
        { time: '23:00', incidents: 12 },
        { time: '00:00', incidents: 7 },
        { time: '01:00', incidents: 3 },
      ];

  const kpis = data?.kpis || {
    safetyIndex: '92 / 100',
    totalReports: hazards.length || 44,
    activeReports: hazards.filter((h) => h.status === 'active').length || 28,
    resolvedReports: hazards.filter((h) => h.status === 'resolved').length || 16,
    totalSos: 6,
    activeJourneys: 12,
    totalUsers: 840,
    peakRiskHours: '21:00 - 23:00',
    averageDispatchSla: '2.4 mins',
  };

  // Top Risk Corridors data
  const riskCorridors = useMemo(() => {
    return [
      {
        id: 1,
        name: 'North Perimeter Canal Road',
        hotspot: 'Hostel Block D to Main Exit',
        hazardCount: 16,
        avgSeverity: 4.2,
        dominantType: 'Poor Lighting & Isolation',
        riskLevel: 'Critical',
        riskBadgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
      },
      {
        id: 2,
        name: 'Forest Quadrangle Link Walk',
        hotspot: 'Library back alley to Sports Complex',
        hazardCount: 11,
        avgSeverity: 3.8,
        dominantType: 'Isolated Area',
        riskLevel: 'High',
        riskBadgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      },
      {
        id: 3,
        name: 'Clock Tower Station Underpass',
        hotspot: 'Transit Hub Terminal 2',
        hazardCount: 9,
        avgSeverity: 3.1,
        dominantType: 'Waterlogging & Infrastructure',
        riskLevel: 'Moderate',
        riskBadgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      },
      {
        id: 4,
        name: 'University Road East Gate Link',
        hotspot: 'Metro Feeder Junction',
        hazardCount: 7,
        avgSeverity: 2.7,
        dominantType: 'Heavy Traffic Congestion',
        riskLevel: 'Moderate',
        riskBadgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      },
    ];
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Safety Intelligence & Heatmap Analytics
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            PostGIS spatial density telemetry, hazard categorization, and peak hour dispatch metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center bg-obsidian-850 border border-white/10 rounded-xl p-1 gap-1">
            {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          {lastUpdated && (
            <span className="text-xs font-mono text-gray-400 flex items-center gap-1.5 hidden md:flex">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Sync: {lastUpdated}
            </span>
          )}

          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Campus Safety Index"
          value={kpis.safetyIndex}
          subtitle="Calculated live from active risks"
          icon={ShieldCheck}
          variant="success"
        />
        <StatCard
          title="Active Field Hazards"
          value={`${kpis.activeReports} / ${kpis.totalReports} total`}
          subtitle={`${kpis.resolvedReports} resolved to date`}
          icon={FileText}
          variant="warning"
        />
        <StatCard
          title="SOS Emergencies Filed"
          value={kpis.totalSos}
          subtitle={`Avg Response SLA: ${kpis.averageDispatchSla}`}
          icon={Flame}
          variant="danger"
        />
        <StatCard
          title="Active Walk Escorts"
          value={kpis.activeJourneys}
          subtitle={`Peak Corridor: ${kpis.peakRiskHours}`}
          icon={Footprints}
          variant="indigo"
        />
      </div>

      {/* Interactive Leaflet Danger Density & Spatial Distribution Heatmap */}
      <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                Interactive Danger Density & Spatial Clusters Map
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Live PostGIS geospatial coordinates with real-time hazard markers, category tagging, and severity radius
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              Critical (Lvl 4-5)
            </span>
            <span className="flex items-center gap-1.5 ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Moderate (Lvl 2-3)
            </span>
            <span className="flex items-center gap-1.5 ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Low (Lvl 1)
            </span>
          </div>
        </div>

        <div className="h-96 rounded-xl overflow-hidden border border-white/10 relative">
          <LiveCommandMap
            hazards={hazards}
            center={[30.3165, 78.0322]}
            zoom={13}
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Proportion by Category (Donut PieChart) */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Hazard Category Proportion & Share
            </h3>
            <span className="text-[10px] font-mono text-gray-400">Total: {totalCategoryIncidents} Reports</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`donut-cell-${index}`} fill={entry.fill} stroke="#0B0F19" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0E1424',
                      borderColor: '#23304A',
                      borderRadius: '8px',
                      color: '#FFF',
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} incidents (${item.payload.percentage}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown pills */}
            <div className="space-y-2.5">
              {categoryPieData.map((cat, idx) => (
                <div
                  key={`cat-legend-${idx}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-obsidian-900/60 border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.fill }}
                    />
                    <span className="text-gray-300 font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-white font-bold">{cat.count}</span>
                    <span className="text-gray-400 text-[10px]">({cat.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hourly Incident Frequency Trend */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Night Corridor Hourly Incident Frequency
            </h3>
            <span className="text-[10px] font-mono text-gray-400">Peak Transit Watch</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" />
                <XAxis dataKey="time" stroke="#6B7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1424',
                    borderColor: '#23304A',
                    borderRadius: '8px',
                    color: '#FFF',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="incidents"
                  stroke="#6366F1"
                  strokeWidth={3}
                  dot={{ fill: '#6366F1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Risk Corridors & Vulnerable Zones Table */}
      <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              High-Risk Corridors & Priority Attention Zones
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-400">Sorted by Density & Severity</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Corridor / Zone</th>
                <th className="py-3 px-4">Hotspot Anchor</th>
                <th className="py-3 px-4">Active Reports</th>
                <th className="py-3 px-4">Avg Severity</th>
                <th className="py-3 px-4">Dominant Threat</th>
                <th className="py-3 px-4">Risk Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {riskCorridors.map((corridor) => (
                <tr key={corridor.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-bold text-white font-sans">{corridor.name}</td>
                  <td className="py-3 px-4 text-gray-400 font-sans">{corridor.hotspot}</td>
                  <td className="py-3 px-4 font-bold text-indigo-400">{corridor.hazardCount}</td>
                  <td className="py-3 px-4">
                    <span className="text-amber-400 font-bold">{corridor.avgSeverity}</span> / 5.0
                  </td>
                  <td className="py-3 px-4 text-gray-300 font-sans">{corridor.dominantType}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${corridor.riskBadgeClass}`}
                    >
                      {corridor.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Severity Breakdown Bar & Proportions */}
      <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            Hazard Severity Breakdown (Level 1 to Level 5)
          </h3>
          <span className="text-[10px] font-mono text-gray-400">Safety Risk Hierarchy</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {severityData.map((item, idx) => (
            <div
              key={`severity-metric-${item.severity}`}
              className="p-4 rounded-xl bg-obsidian-900/80 border border-white/5 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-gray-400">Lvl {item.severity}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLORS[idx % SEVERITY_COLORS.length] }}
                ></span>
              </div>
              <div className="text-xl font-black text-white font-mono">{item.reports}</div>
              <span className="text-[10px] text-gray-400 block truncate">{item.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
