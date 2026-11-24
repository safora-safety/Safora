import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2,
  Download,
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'CRASH' | 'ERROR' | 'WARN' | 'INFO';
  source: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRASH' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchLogs = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const res = await apiClient.get<{ logs: SystemLogEntry[] }>('/diagnostics/logs');
      setLogs(res.data.logs || []);
    } catch (err: any) {
      console.warn('Failed to fetch system logs:', err);
      if (!quiet) showToast('Failed to connect to log telemetry stream');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all recorded system logs?')) return;
    try {
      await apiClient.post('/diagnostics/logs/clear');
      showToast('System logs cleared successfully');
      fetchLogs();
    } catch (err) {
      showToast('Failed to clear system logs');
    }
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `safora-system-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Logs exported to JSON');
  };

  const handleCopyStack = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = activeFilter === 'ALL' || log.level === activeFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      log.message.toLowerCase().includes(query) ||
      log.source.toLowerCase().includes(query) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });

  const crashCount = logs.filter((l) => l.level === 'CRASH').length;
  const errorCount = logs.filter((l) => l.level === 'ERROR').length;
  const warnCount = logs.filter((l) => l.level === 'WARN').length;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 relative max-w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#172033] border border-indigo-500/50 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-2 animate-fade-in">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Terminal className="w-6 h-6 text-indigo-400" />
              Crash &amp; System Logs
            </h1>
            <span className="text-[11px] font-mono bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">
              Live Ring Buffer
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Real-time telemetry stream capturing runtime exceptions, database timeouts, and unhandled crashes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#172033] border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            Auto-Refresh: {autoRefresh ? '5s' : 'Off'}
          </button>

          <button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#172033] border border-white/10 text-gray-200 hover:border-white/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportLogs}
            disabled={logs.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#172033] border border-white/10 text-gray-200 hover:border-white/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            Export JSON
          </button>

          <button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0E1424] border border-white/5 rounded-xl p-4">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Log Events</span>
          <span className="text-2xl font-extrabold text-white font-mono mt-1 block">{logs.length}</span>
          <span className="text-[11px] text-gray-500 mt-1 block">In-memory circular capacity: 200</span>
        </div>

        <div className="bg-[#0E1424] border border-white/5 rounded-xl p-4">
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            Fatal Crashes
          </span>
          <span className="text-2xl font-extrabold text-rose-400 font-mono mt-1 block">{crashCount}</span>
          <span className="text-[11px] text-gray-500 mt-1 block">500 errors &amp; unhandled rejections</span>
        </div>

        <div className="bg-[#0E1424] border border-white/5 rounded-xl p-4">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            System Warnings
          </span>
          <span className="text-2xl font-extrabold text-amber-400 font-mono mt-1 block">{warnCount}</span>
          <span className="text-[11px] text-gray-500 mt-1 block">Timeouts &amp; deferred initializations</span>
        </div>

        <div className="bg-[#0E1424] border border-white/5 rounded-xl p-4">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            System Stability
          </span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
            {crashCount === 0 ? '100%' : `${Math.max(0, 100 - crashCount * 5).toFixed(1)}%`}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">Watchdog &amp; Express health score</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0E1424] border border-white/5 p-3 rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: `All (${logs.length})` },
            { id: 'CRASH', label: `Crashes (${crashCount})`, color: 'text-rose-400' },
            { id: 'ERROR', label: `Errors (${errorCount})`, color: 'text-rose-300' },
            { id: 'WARN', label: `Warnings (${warnCount})`, color: 'text-amber-400' },
            { id: 'INFO', label: `Info (${logs.length - crashCount - errorCount - warnCount})`, color: 'text-sky-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#172033] text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search message, source, url..."
            className="w-full bg-[#172033] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Logs Stream Table */}
      <div className="bg-[#0E1424] border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#172033] border-b border-white/5 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-28">Severity</th>
                <th className="py-3 px-4 w-44">Timestamp</th>
                <th className="py-3 px-4 w-36">Source</th>
                <th className="py-3 px-4">Event Message</th>
                <th className="py-3 px-4 w-24 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold">No log events match your filter criteria.</p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      {logs.length === 0
                        ? 'System is running cleanly with zero logged exceptions.'
                        : 'Try selecting "All" or clearing the search query.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const time = new Date(log.timestamp).toLocaleTimeString();
                  const date = new Date(log.timestamp).toLocaleDateString();

                  let badgeBg = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
                  let icon = <Info className="w-3 h-3 text-sky-400" />;

                  if (log.level === 'CRASH') {
                    badgeBg = 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse';
                    icon = <AlertOctagon className="w-3 h-3 text-rose-400" />;
                  } else if (log.level === 'ERROR') {
                    badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                    icon = <AlertTriangle className="w-3 h-3 text-rose-400" />;
                  } else if (log.level === 'WARN') {
                    badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                    icon = <AlertTriangle className="w-3 h-3 text-amber-400" />;
                  }

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${
                          isExpanded ? 'bg-white/[0.03]' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wider ${badgeBg}`}
                          >
                            {icon}
                            {log.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                          <span>{time}</span>
                          <span className="text-gray-600 ml-1.5 font-sans">{date}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          <span className="bg-[#172033] px-1.5 py-0.5 rounded border border-white/5">
                            {log.source}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-200 font-medium">
                          <div className="truncate max-w-xl">{log.message}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLogId(isExpanded ? null : log.id);
                            }}
                            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Trace & Metadata Row */}
                      {isExpanded && (
                        <tr className="bg-[#070A11]/60">
                          <td colSpan={5} className="p-4 border-t border-b border-white/5">
                            <div className="space-y-3">
                              {/* Metadata Badges */}
                              {log.metadata && (
                                <div className="flex flex-wrap gap-2 items-center text-[11px]">
                                  <span className="text-gray-500 font-semibold uppercase">Context:</span>
                                  {Object.entries(log.metadata).map(([k, v]) => (
                                    <span
                                      key={k}
                                      className="bg-[#172033] text-gray-300 font-mono px-2 py-0.5 rounded border border-white/10"
                                    >
                                      <strong className="text-gray-500 mr-1">{k}:</strong>
                                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Stack Trace / Full Message Box */}
                              <div className="bg-[#050811] border border-white/10 rounded-lg p-3 relative group">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Terminal className="w-3 h-3 text-indigo-400" />
                                    {log.stack ? 'Exception Stack Trace' : 'Full Log Payload'}
                                  </span>
                                  <button
                                    onClick={() => handleCopyStack(log.id, log.stack || log.message)}
                                    className="bg-[#172033] hover:bg-white/10 text-gray-300 px-2 py-1 rounded text-[10px] flex items-center gap-1 border border-white/10 transition-colors"
                                  >
                                    {copiedId === log.id ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="font-mono text-[11.5px] text-rose-300/90 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                                  {log.stack || log.message}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
