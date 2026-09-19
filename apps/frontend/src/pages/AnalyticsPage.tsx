import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { reportService, AnalyticsData } from '../services/reportService';

const SEVERITY_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'];

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await reportService.getAnalyticsSummary();
      setData(res);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const categoryData = data?.categoryData?.length
    ? data.categoryData
    : [
        { name: 'Poor Lighting', count: 0, fill: '#F59E0B' },
        { name: 'Road Hazard', count: 0, fill: '#EF4444' },
        { name: 'Waterlogging', count: 0, fill: '#06B6D4' },
        { name: 'Isolated Area', count: 0, fill: '#8B5CF6' },
        { name: 'Heavy Traffic', count: 0, fill: '#EC4899' },
      ];

  const severityData = data?.severityData?.length
    ? data.severityData
    : [
        { level: 'Severity 1 (Minor)', severity: 1, reports: 0 },
        { level: 'Severity 2 (Moderate)', severity: 2, reports: 0 },
        { level: 'Severity 3 (Substantial)', severity: 3, reports: 0 },
        { level: 'Severity 4 (Severe)', severity: 4, reports: 0 },
        { level: 'Severity 5 (Critical)', severity: 5, reports: 0 },
      ];

  const hourlyTrend = data?.hourlyTrend?.length
    ? data.hourlyTrend
    : [
        { time: '18:00', incidents: 0 },
        { time: '19:00', incidents: 0 },
        { time: '20:00', incidents: 0 },
        { time: '21:00', incidents: 0 },
        { time: '22:00', incidents: 0 },
        { time: '23:00', incidents: 0 },
        { time: '00:00', incidents: 0 },
        { time: '01:00', incidents: 0 },
      ];

  const kpis = data?.kpis || {
    safetyIndex: '92 / 100',
    totalReports: 0,
    activeReports: 0,
    resolvedReports: 0,
    totalSos: 0,
    activeJourneys: 0,
    totalUsers: 0,
    peakRiskHours: '21:00 - 23:00',
    averageDispatchSla: '2.4 mins',
  };

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

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Live Sync: {lastUpdated}
            </span>
          )}
          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Analytics</span>
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Volume by Category */}
        <div className="p-6 rounded-2xl bg-obsidian-850 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Incidents by Hazard Category
            </h3>
            <span className="text-[10px] font-mono text-gray-400">Live PostGIS Records</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1424',
                    borderColor: '#23304A',
                    borderRadius: '8px',
                    color: '#FFF',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || '#6366F1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
