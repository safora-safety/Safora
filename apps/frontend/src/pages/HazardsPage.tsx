import React, { useState, useEffect, useMemo } from 'react';
import { reportService } from '../services/reportService';
import { HazardReport, HazardStatus } from '@safora/shared-types';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { HazardFilters } from '../components/hazards/HazardFilters';
import { HazardTable } from '../components/hazards/HazardTable';
import { HazardResolutionModal } from '../components/hazards/HazardResolutionModal';
import { HazardDispatchModal } from '../components/hazards/HazardDispatchModal';
import { HazardAuditModal } from '../components/hazards/HazardAuditModal';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  PlusCircle,
  MapPin,
  Calendar,
} from 'lucide-react';

export const HazardsPage: React.FC = () => {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [inspectedReport, setInspectedReport] = useState<HazardReport | null>(null);
  const [moderatingId, setModeratingId] = useState<string | number | null>(null);

  // Selection & Batch Action State
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Table Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Resolution Notes Modal State
  const [resolveTarget, setResolveTarget] = useState<{
    id?: string | number;
    isBatch?: boolean;
    title?: string;
  } | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Manual Admin Hazard Pin Modal State
  const [showAddHazardModal, setShowAddHazardModal] = useState(false);
  const [newHazardTitle, setNewHazardTitle] = useState('');
  const [newHazardCategory, setNewHazardCategory] = useState('lighting');
  const [newHazardSeverity, setNewHazardSeverity] = useState(3);
  const [newHazardLat, setNewHazardLat] = useState('30.3165');
  const [newHazardLng, setNewHazardLng] = useState('78.0322');
  const [newHazardDesc, setNewHazardDesc] = useState('');
  const [submittingHazard, setSubmittingHazard] = useState(false);

  // Community Confirmations Audit Modal State
  const [auditTarget, setAuditTarget] = useState<HazardReport | null>(null);

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

  const openResolveModal = (report: HazardReport) => {
    setResolveTarget({ id: report.id, isBatch: false, title: report.title });
    setResolutionNotes(report.resolutionNotes || '');
  };

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

  const handleCreateAdminHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHazardTitle.trim()) {
      showToast('Please provide a hazard title');
      return;
    }
    const lat = parseFloat(newHazardLat);
    const lng = parseFloat(newHazardLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      showToast('Please provide valid coordinates (Lat: -90..90, Lng: -180..180)');
      return;
    }

    setSubmittingHazard(true);
    try {
      const created = await reportService.createReport({
        title: newHazardTitle.trim(),
        category: newHazardCategory,
        severity: newHazardSeverity,
        latitude: lat,
        longitude: lng,
        description: newHazardDesc.trim() || undefined,
      });

      setReports((prev) => [created, ...prev]);
      setShowAddHazardModal(false);
      setNewHazardTitle('');
      setNewHazardDesc('');
      showToast('Official city hazard pin dispatched successfully!');
    } catch (err: any) {
      console.error('Failed to create hazard pin:', err);
      showToast(err?.response?.data?.message || 'Failed to dispatch hazard pin');
    } finally {
      setSubmittingHazard(false);
    }
  };

  // Filter pipeline
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
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
  }, [reports, searchTerm, selectedCategory, selectedStatus]);

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredReports.slice(startIndex, startIndex + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const allFilteredSelected =
    filteredReports.length > 0 &&
    filteredReports.every((r) => selectedIds.has(r.id));

  const lastSelectedIndexRef = React.useRef<number | null>(null);

  const toggleSelectReport = (id: string | number, event?: React.MouseEvent) => {
    const currentIndex = paginatedReports.findIndex((r) => r.id === id);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (event?.shiftKey && lastSelectedIndexRef.current !== null && currentIndex !== -1) {
        const start = Math.min(lastSelectedIndexRef.current, currentIndex);
        const end = Math.max(lastSelectedIndexRef.current, currentIndex);
        for (let i = start; i <= end; i++) {
          next.add(paginatedReports[i].id);
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });

    lastSelectedIndexRef.current = currentIndex;
  };

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

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddHazardModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Hazard Pin</span>
          </button>

          <button
            onClick={loadReports}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Reports</span>
          </button>
        </div>
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
      <HazardFilters
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        selectedCategory={selectedCategory}
        onCategoryChange={(val) => {
          setSelectedCategory(val);
          setCurrentPage(1);
        }}
        selectedStatus={selectedStatus}
        onStatusChange={(val) => {
          setSelectedStatus(val);
          setCurrentPage(1);
        }}
        onReset={() => {
          setSelectedCategory('all');
          setSelectedStatus('all');
          setSearchTerm('');
          setCurrentPage(1);
        }}
      />

      {/* Reports Table Component */}
      <HazardTable
        reports={paginatedReports}
        totalMatchingCount={filteredReports.length}
        isLoading={isLoading}
        selectedIds={selectedIds}
        allFilteredSelected={allFilteredSelected}
        onToggleSelectAll={toggleSelectAllFiltered}
        onToggleSelect={toggleSelectReport}
        onInspectPhoto={(report) => setInspectedReport(report)}
        onOpenAudit={(report) => setAuditTarget(report)}
        onOpenResolve={(report) => openResolveModal(report)}
        onModerateStatus={(id, status) => handleModerateSingle(id, status)}
        moderatingId={moderatingId}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

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
      <HazardResolutionModal
        target={resolveTarget}
        onClose={() => setResolveTarget(null)}
        notes={resolutionNotes}
        onChangeNotes={setResolutionNotes}
        onConfirm={handleConfirmResolution}
        isSubmitting={submittingResolution}
      />

      {/* High-Resolution Photo & Evidence Inspector Modal */}
      <Modal
        isOpen={Boolean(inspectedReport && inspectedReport.photoUrl)}
        onClose={() => setInspectedReport(null)}
        title={
          inspectedReport
            ? `Hazard Evidence: #${inspectedReport.id} • ${inspectedReport.title}`
            : 'Hazard Photo Inspection'
        }
        maxWidth="4xl"
      >
        {inspectedReport && inspectedReport.photoUrl && (
          <div className="space-y-4">
            {/* High-res Image Preview */}
            <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/70 flex items-center justify-center min-h-[300px] max-h-[60vh]">
              <img
                src={inspectedReport.photoUrl}
                alt={inspectedReport.title}
                className="w-full max-h-[60vh] object-contain"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cloudinary Verified
                </span>
              </div>
            </div>

            {/* Tactical Evidence Dossier Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-obsidian-800/80 border border-white/10 text-xs font-mono">
              {/* EXIF / Timestamp */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase text-gray-400 flex items-center gap-1 font-semibold">
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  <span>Reported Timestamp</span>
                </div>
                <div className="text-white font-medium" data-tabular-nums="true">
                  {new Date(inspectedReport.createdAt || Date.now()).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })}
                </div>
              </div>

              {/* Verified GPS Coordinates */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase text-gray-400 flex items-center gap-1 font-semibold">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>Verified Coordinates</span>
                </div>
                <div className="text-emerald-300 font-medium" data-tabular-nums="true">
                  {inspectedReport.latitude.toFixed(5)}, {inspectedReport.longitude.toFixed(5)}
                </div>
              </div>

              {/* Reporter / Category / Severity */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase text-gray-400 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Category &amp; Severity</span>
                </div>
                <div className="text-gray-200 capitalize">
                  {inspectedReport.category} • Level {inspectedReport.severity}/5
                </div>
              </div>
            </div>

            {/* Footer Navigation & Fast Triage Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-3 text-xs">
                <a
                  href={inspectedReport.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  Raw Asset <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-white/20">&bull;</span>
                <a
                  href={`https://www.google.com/maps?q=${inspectedReport.latitude},${inspectedReport.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                >
                  Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Fast Triage Buttons */}
              <div className="flex items-center gap-2">
                {inspectedReport.status !== 'active' && (
                  <button
                    onClick={() => {
                      handleModerateSingle(inspectedReport.id, 'active');
                      setInspectedReport(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                  >
                    ✓ Approve
                  </button>
                )}
                {inspectedReport.status !== 'fake' && (
                  <button
                    onClick={() => {
                      handleModerateSingle(inspectedReport.id, 'fake');
                      setInspectedReport(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                  >
                    ✕ Dismiss Fake
                  </button>
                )}
                {inspectedReport.status !== 'duplicate' && (
                  <button
                    onClick={() => {
                      handleModerateSingle(inspectedReport.id, 'duplicate');
                      setInspectedReport(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                  >
                    Duplicate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Manual Admin Hazard Pin Dispatch Modal */}
      <HazardDispatchModal
        isOpen={showAddHazardModal}
        onClose={() => setShowAddHazardModal(false)}
        onSubmit={handleCreateAdminHazard}
        title={newHazardTitle}
        onChangeTitle={setNewHazardTitle}
        category={newHazardCategory}
        onChangeCategory={setNewHazardCategory}
        severity={newHazardSeverity}
        onChangeSeverity={setNewHazardSeverity}
        latitude={newHazardLat}
        onChangeLatitude={setNewHazardLat}
        longitude={newHazardLng}
        onChangeLongitude={setNewHazardLng}
        description={newHazardDesc}
        onChangeDescription={setNewHazardDesc}
        isSubmitting={submittingHazard}
      />

      {/* Community Confirmation & Reporter Audit Modal */}
      <HazardAuditModal
        target={auditTarget}
        onClose={() => setAuditTarget(null)}
      />
    </div>
  );
};

export default HazardsPage;
