import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';
import { HazardReport, HazardStatus } from '@safora/shared-types';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
  CheckSquare,
  Square,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const HazardsPage: React.FC = () => {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [inspectedPhoto, setInspectedPhoto] = useState<string | null>(null);
  const [moderatingId, setModeratingId] = useState<string | number | null>(null);

  // Selection & Batch Action State
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Resolution Notes Modal State
  const [resolveTarget, setResolveTarget] = useState<{
    id?: string | number;
    isBatch?: boolean;
    title?: string;
  } | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await reportService.getReports(150);
      setReports(data);
    } catch (err) {
      console.warn('Failed to load reports:', err);
      showToast('Failed to load latest reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Compute live statistics for StatCards
  const totalCount = reports.length;
  const activeCount = reports.filter((r) => r.status === 'active').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const fakeCount = reports.filter((r) => r.status === 'fake').length;
  const duplicateCount = reports.filter((r) => r.status === 'duplicate').length;

  const handleModerateSingle = async (
    id: string | number,
    newStatus: HazardStatus,
    notes?: string
  ) => {
    setModeratingId(id);
    try {
      await reportService.moderateReport(id, newStatus, notes);
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: newStatus, resolutionNotes: notes || r.resolutionNotes }
            : r
        )
      );
      showToast(`Report updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to moderate report:', err);
      showToast('Error updating report status');
    } finally {
      setModeratingId(null);
    }
  };

  // Open the Resolution Modal for a single report
  const openResolveModal = (report: HazardReport) => {
    setResolveTarget({ id: report.id, isBatch: false, title: report.title });
    setResolutionNotes(report.resolutionNotes || '');
  };

  // Open the Resolution Modal for selected batch
  const openBatchResolveModal = () => {
    if (selectedIds.size === 0) return;
    setResolveTarget({ isBatch: true, title: `${selectedIds.size} Selected Hazards` });
    setResolutionNotes('');
  };

  const handleConfirmResolution = async () => {
    if (!resolveTarget) return;
    setSubmittingResolution(true);
    try {
      if (resolveTarget.isBatch) {
        const ids = Array.from(selectedIds);
        await Promise.all(
          ids.map((id) => reportService.moderateReport(id, 'resolved', resolutionNotes))
        );
        setReports((prev) =>
          prev.map((r) =>
            selectedIds.has(r.id)
              ? { ...r, status: 'resolved', resolutionNotes }
              : r
          )
        );
        showToast(`${ids.length} reports marked as resolved`);
        setSelectedIds(new Set());
      } else if (resolveTarget.id) {
        await handleModerateSingle(resolveTarget.id, 'resolved', resolutionNotes);
      }
      setResolveTarget(null);
      setResolutionNotes('');
    } catch (err) {
      console.error('Resolution failed:', err);
      showToast('Failed to apply resolution');
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleBatchStatus = async (newStatus: HazardStatus) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setModeratingId('batch');
    try {
      await Promise.all(
        ids.map((id) => reportService.moderateReport(id, newStatus))
      );
      setReports((prev) =>
        prev.map((r) =>
          selectedIds.has(r.id) ? { ...r, status: newStatus } : r
        )
      );
      showToast(`${ids.length} reports marked as ${newStatus}`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Batch status update failed:', err);
      showToast('Batch moderation failed');
    } finally {
      setModeratingId(null);
    }
  };

  const toggleSelectReport = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter pipeline
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.reporterName && r.reporterName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || r.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'all' || r.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const allFilteredSelected =
    filteredReports.length > 0 &&
    filteredReports.every((r) => selectedIds.has(r.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map((r) => r.id)));
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 relative max-w-full">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-indigo-400">
          <Sparkles className="w-4 h-4 text-indigo-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Hazard & Incident Moderation
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Review, verify, resolve with dispatch notes, or purge spam community hazards
          </p>
        </div>

        <button
          onClick={loadReports}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Reports</span>
        </button>
      </div>

      {/* Interactive Top StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3.5">
        <div className={selectedStatus === 'all' ? 'ring-2 ring-indigo-500 rounded-2xl' : ''}>
          <StatCard
            title="Total Reports"
            value={totalCount}
            subtitle={selectedStatus === 'all' ? '● Showing all' : 'Click to show all'}
            icon={<AlertTriangle className="w-5 h-5 text-indigo-400" />}
            color="indigo"
            onClick={() => setSelectedStatus('all')}
          />
        </div>

        <div className={selectedStatus === 'active' ? 'ring-2 ring-amber-500 rounded-2xl' : ''}>
          <StatCard
            title="Active / Pending"
            value={activeCount}
            subtitle={selectedStatus === 'active' ? '● Filtered active' : 'Click to filter'}
            icon={<Clock className="w-5 h-5 text-amber-400" />}
            color="amber"
            onClick={() => setSelectedStatus('active')}
          />
        </div>

        <div className={selectedStatus === 'resolved' ? 'ring-2 ring-emerald-500 rounded-2xl' : ''}>
          <StatCard
            title="Resolved"
            value={resolvedCount}
            subtitle={selectedStatus === 'resolved' ? '● Filtered resolved' : 'Click to filter'}
            icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
            color="emerald"
            onClick={() => setSelectedStatus('resolved')}
          />
        </div>

        <div className={selectedStatus === 'fake' ? 'ring-2 ring-red-500 rounded-2xl' : ''}>
          <StatCard
            title="Flagged Fake"
            value={fakeCount}
            subtitle={selectedStatus === 'fake' ? '● Filtered fake' : 'Click to filter'}
            icon={<XCircle className="w-5 h-5 text-red-400" />}
            color="red"
            onClick={() => setSelectedStatus('fake')}
          />
        </div>

        <div className={selectedStatus === 'duplicate' ? 'ring-2 ring-purple-500 rounded-2xl' : ''}>
          <StatCard
            title="Duplicate"
            value={duplicateCount}
            subtitle={selectedStatus === 'duplicate' ? '● Filtered duplicate' : 'Click to filter'}
            icon={<ShieldCheck className="w-5 h-5 text-purple-400" />}
            color="purple"
            onClick={() => setSelectedStatus('duplicate')}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-obsidian-850 border border-white/10 flex flex-wrap gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by title, description, or reporter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-obsidian-900 border border-white/10 focus:border-indigo-500 text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white outline-none"
          >
            <option value="all">All Categories</option>
            <option value="lighting">Poor Lighting</option>
            <option value="road_hazard">Road Hazard</option>
            <option value="waterlogging">Waterlogging</option>
            <option value="isolated_area">Isolated Area</option>
            <option value="traffic">Heavy Traffic</option>
            <option value="other">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active / Pending</option>
            <option value="resolved">Resolved</option>
            <option value="fake">Flagged Fake</option>
            <option value="duplicate">Duplicate</option>
          </select>

          {(selectedCategory !== 'all' || selectedStatus !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSearchTerm('');
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-2xl bg-obsidian-850 border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-obsidian-800/90 text-gray-400 uppercase font-mono tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <button
                    onClick={toggleSelectAllFiltered}
                    className="text-gray-400 hover:text-white transition-colors"
                    title={allFilteredSelected ? 'Deselect all' : 'Select all matching'}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Photo</th>
                <th className="py-3.5 px-4">Hazard Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Moderator Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredReports.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 font-mono">
                    No matching hazard reports found.
                  </td>
                </tr>
              )}

              {filteredReports.map((report) => {
                const isSelected = selectedIds.has(report.id);
                return (
                  <tr
                    key={`report-row-${report.id}`}
                    className={`transition-colors ${
                      isSelected ? 'bg-indigo-950/20' : 'hover:bg-obsidian-750/50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleSelectReport(report.id)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Thumbnail */}
                    <td className="py-3 px-4">
                      {report.photoUrl ? (
                        <img
                          src={report.photoUrl}
                          alt="Thumbnail"
                          onClick={() => setInspectedPhoto(report.photoUrl!)}
                          className="w-12 h-12 object-cover rounded-lg border border-white/10 cursor-pointer hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-obsidian-800 border border-white/5 flex items-center justify-center text-[10px] text-gray-500 font-mono">
                          No Img
                        </div>
                      )}
                    </td>

                    {/* Title & Reporter & Source */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-white text-sm">{report.title}</div>
                        {report.source && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {report.source.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      {report.description && (
                        <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                          {report.description}
                        </p>
                      )}
                      {report.resolutionNotes && (
                        <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                          <div>
                            <span className="font-bold text-amber-200 uppercase tracking-wider mr-1">
                              Resolution:
                            </span>
                            {report.resolutionNotes}
                          </div>
                        </div>
                      )}
                      <div className="text-[11px] text-gray-500 mt-1.5 font-mono flex items-center gap-2 flex-wrap">
                        <span className="text-indigo-400 font-semibold">
                          {report.reporterName || 'SAFORA Citizen'}
                        </span>
                        <span>&bull;</span>
                        <span>
                          {new Date(report.createdAt || Date.now()).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>&bull;</span>
                        <span className="text-emerald-400 font-semibold">
                          {report.confirmationsCount || 0} confirms
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-gray-300 capitalize">
                        {report.category.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-amber-400">{report.severity}/5</span>
                        <div className="w-12 h-1.5 bg-obsidian-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${(report.severity / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-gray-300">
                      {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        variant={
                          report.status === 'active'
                            ? 'warning'
                            : report.status === 'resolved'
                            ? 'success'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {report.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                      {report.status !== 'resolved' && (
                        <button
                          disabled={moderatingId === report.id}
                          onClick={() => openResolveModal(report)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-semibold transition-colors disabled:opacity-50"
                          title="Mark Resolved with Notes"
                        >
                          Resolve
                        </button>
                      )}
                      {report.status !== 'fake' && (
                        <button
                          disabled={moderatingId === report.id}
                          onClick={() => handleModerateSingle(report.id, 'fake')}
                          className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold transition-colors disabled:opacity-50"
                          title="Mark Fake / Malicious"
                        >
                          Fake
                        </button>
                      )}
                      {report.status !== 'duplicate' && (
                        <button
                          disabled={moderatingId === report.id}
                          onClick={() => handleModerateSingle(report.id, 'duplicate')}
                          className="px-2.5 py-1 rounded-lg bg-gray-700/50 hover:bg-gray-700 border border-white/10 text-gray-300 font-semibold transition-colors disabled:opacity-50"
                          title="Mark Duplicate"
                        >
                          Duplicate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-obsidian-900/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl px-3 sm:px-5 py-2.5 sm:py-3 shadow-2xl flex flex-wrap items-center justify-center gap-2 sm:gap-4 max-w-[95vw] animate-in fade-in slide-in-from-bottom-4">
          <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
            <span>{selectedIds.size} Selected</span>
          </div>

          <div className="h-4 w-px bg-white/20"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={openBatchResolveModal}
              disabled={moderatingId === 'batch'}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
            >
              Batch Resolve
            </button>
            <button
              onClick={() => handleBatchStatus('fake')}
              disabled={moderatingId === 'batch'}
              className="px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
            >
              Batch Fake
            </button>
            <button
              onClick={() => handleBatchStatus('duplicate')}
              disabled={moderatingId === 'batch'}
              className="px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold transition-colors"
            >
              Batch Duplicate
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs transition-colors"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Resolution Notes Modal */}
      <Modal
        isOpen={Boolean(resolveTarget)}
        onClose={() => setResolveTarget(null)}
        title={`Resolve Hazard: ${resolveTarget?.title || ''}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Document dispatch action, municipal maintenance report, or verification details for auditing and citizen visibility:
          </p>

          <div>
            <label className="block text-xs font-mono text-gray-300 mb-1.5">
              Resolution Notes (Optional)
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Streetlight luminaire replaced by municipal electric dept. Tested operational."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-white/10 focus:border-indigo-500 text-xs text-white placeholder-gray-500 outline-none resize-none"
            />
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-gray-400">Quick Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Repaired by Municipal Maintenance crew',
                'Hazard cleared & corridor verified safe',
                'Lighting restored to standard intensity',
                'Road obstacle removed by traffic police',
                'False alarm / cleared on physical patrol',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setResolutionNotes(preset)}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-gray-300 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              onClick={() => setResolveTarget(null)}
              disabled={submittingResolution}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmResolution}
              disabled={submittingResolution}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{submittingResolution ? 'Saving...' : 'Confirm Resolution'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Photo Inspector Modal */}
      <Modal
        isOpen={Boolean(inspectedPhoto)}
        onClose={() => setInspectedPhoto(null)}
        title="Hazard Photo Inspection"
        maxWidth="2xl"
      >
        {inspectedPhoto && (
          <div className="space-y-4">
            <img
              src={inspectedPhoto}
              alt="Hazard Full View"
              className="w-full max-h-[65vh] object-contain rounded-xl border border-white/10 bg-black/50"
            />
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>Cloudinary verified evidence</span>
              <a
                href={inspectedPhoto}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                Open in Full Size <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
