import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';
import { HazardReport, HazardStatus, HazardCategory } from '@safora/shared-types';
import { Badge } from '../components/common/Badge';
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
} from 'lucide-react';

export const HazardsPage: React.FC = () => {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [inspectedPhoto, setInspectedPhoto] = useState<string | null>(null);
  const [moderatingId, setModeratingId] = useState<string | number | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await reportService.getReports(100);
      setReports(data);
    } catch (err) {
      console.warn('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleModerate = async (id: string | number, newStatus: HazardStatus) => {
    setModeratingId(id);
    try {
      await reportService.moderateReport(id, newStatus);
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error('Failed to moderate report:', err);
    } finally {
      setModeratingId(null);
    }
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Hazard & Incident Moderation
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Review, verify, resolve, or flag crowdsourced community hazards
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
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-2xl bg-obsidian-850 border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-obsidian-800/90 text-gray-400 uppercase font-mono tracking-wider border-b border-white/10">
              <tr>
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
                  <td colSpan={7} className="py-10 text-center text-gray-500 font-mono">
                    No matching hazard reports found.
                  </td>
                </tr>
              )}

              {filteredReports.map((report) => (
                <tr
                  key={`report-row-${report.id}`}
                  className="hover:bg-obsidian-750/50 transition-colors"
                >
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
                      <p className="text-gray-300 text-xs mt-1 leading-relaxed">{report.description}</p>
                    )}
                    {report.resolutionNotes && (
                      <div className="mt-1.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono">
                        <span className="font-semibold text-amber-200 uppercase tracking-wider mr-1">Resolution:</span>
                        {report.resolutionNotes}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500 mt-1.5 font-mono flex items-center gap-2 flex-wrap">
                      <span className="text-indigo-400 font-semibold">{report.reporterName || 'SAFORA Command'}</span>
                      <span>&bull;</span>
                      <span>{new Date(report.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>&bull;</span>
                      <span className="text-emerald-400 font-semibold">{report.confirmationsCount || 0} confirms</span>
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
                        onClick={() => handleModerate(report.id, 'resolved')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-semibold transition-colors"
                        title="Mark Resolved"
                      >
                        Resolve
                      </button>
                    )}
                    {report.status !== 'fake' && (
                      <button
                        disabled={moderatingId === report.id}
                        onClick={() => handleModerate(report.id, 'fake')}
                        className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold transition-colors"
                        title="Mark Fake / Malicious"
                      >
                        Fake
                      </button>
                    )}
                    {report.status !== 'duplicate' && (
                      <button
                        disabled={moderatingId === report.id}
                        onClick={() => handleModerate(report.id, 'duplicate')}
                        className="px-2.5 py-1 rounded-lg bg-gray-700/50 hover:bg-gray-700 border border-white/10 text-gray-300 font-semibold transition-colors"
                        title="Mark Duplicate"
                      >
                        Duplicate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
