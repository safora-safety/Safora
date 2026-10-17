import React from 'react';
import { HazardReport, HazardStatus } from '@safora/shared-types';
import { Badge } from '../common/Badge';
import { Pagination } from '../common/Pagination';
import {
  CheckSquare,
  Square,
  MessageSquare,
  Users,
} from 'lucide-react';

interface HazardTableProps {
  reports: HazardReport[];
  totalMatchingCount: number;
  isLoading: boolean;
  selectedIds: Set<string | number>;
  allFilteredSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string | number, event?: React.MouseEvent) => void;
  onInspectPhoto: (report: HazardReport) => void;
  onOpenAudit: (report: HazardReport) => void;
  onOpenResolve: (report: HazardReport) => void;
  onModerateStatus: (id: string | number, status: HazardStatus) => void;
  moderatingId: string | number | null;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const HazardTable: React.FC<HazardTableProps> = ({
  reports,
  totalMatchingCount,
  isLoading,
  selectedIds,
  allFilteredSelected,
  onToggleSelectAll,
  onToggleSelect,
  onInspectPhoto,
  onOpenAudit,
  onOpenResolve,
  onModerateStatus,
  moderatingId,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.ceil(totalMatchingCount / pageSize) || 1;

  return (
    <div className="rounded-2xl bg-obsidian-850 border border-white/10 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-obsidian-800/90 text-gray-400 uppercase font-mono tracking-wider border-b border-white/10">
            <tr>
              <th className="py-3.5 px-4 w-10 text-center">
                <button
                  onClick={onToggleSelectAll}
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
            {reports.length === 0 && !isLoading && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500 font-mono">
                  No matching hazard reports found.
                </td>
              </tr>
            )}

            {reports.map((report) => {
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
                      onClick={(e) => onToggleSelect(report.id, e)}
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
                        onClick={() => onInspectPhoto(report)}
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
                      <button
                        onClick={() => onOpenAudit(report)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                        title="View Community Confirmation & Reporter Audit"
                      >
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span>{report.confirmationsCount || 0} confirms</span>
                      </button>
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
                        onClick={() => onOpenResolve(report)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-semibold transition-colors disabled:opacity-50"
                        title="Mark Resolved with Notes"
                      >
                        Resolve
                      </button>
                    )}
                    {report.status !== 'fake' && (
                      <button
                        disabled={moderatingId === report.id}
                        onClick={() => onModerateStatus(report.id, 'fake')}
                        className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold transition-colors disabled:opacity-50"
                        title="Mark Fake / Malicious"
                      >
                        Fake
                      </button>
                    )}
                    {report.status !== 'duplicate' && (
                      <button
                        disabled={moderatingId === report.id}
                        onClick={() => onModerateStatus(report.id, 'duplicate')}
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

        {/* Table Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalMatchingCount}
          limit={pageSize}
          onPageChange={onPageChange}
          onLimitChange={onPageSizeChange}
          label="hazards"
        />
      </div>
    </div>
  );
};

export default HazardTable;
