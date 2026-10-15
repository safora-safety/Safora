import React from 'react';
import { User, UserRole } from '@safora/shared-types';
import { Badge, BadgeVariant } from '../common/Badge';
import { Pagination } from '../common/Pagination';
import { RefreshCw, Eye, Shield, UserX } from 'lucide-react';

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  actionLoadingId: string | number | null;
  onViewUser: (user: User) => void;
  onOpenRoleModal: (user: User) => void;
  onToggleStatus: (user: User) => void;
  getRoleBadgeVariant: (role?: UserRole) => BadgeVariant;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  actionLoadingId,
  onViewUser,
  onOpenRoleModal,
  onToggleStatus,
  getRoleBadgeVariant,
  currentPage,
  totalPages,
  totalUsers,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  return (
    <div className="rounded-2xl bg-obsidian-850 border border-white/10 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-obsidian-900/60 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              <th className="py-3.5 px-6">User / Member</th>
              <th className="py-3.5 px-6">Phone Number</th>
              <th className="py-3.5 px-6">Assigned Role</th>
              <th className="py-3.5 px-6">Account Status</th>
              <th className="py-3.5 px-6">Joined Date</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {isLoading && users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 font-mono">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Querying campus member directory...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500 font-mono">
                  No registered members matching current filter criteria.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isActive = user.isActive ?? true;
                const isBusy = actionLoadingId === user.id;

                return (
                  <tr
                    key={`user-${user.id}`}
                    className="hover:bg-obsidian-800/50 transition-colors group"
                  >
                    {/* Name & Email */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {user.name ? user.name.substring(0, 2) : 'US'}
                        </div>
                        <div>
                          <span className="font-bold text-white block group-hover:text-indigo-300 transition-colors">
                            {user.name}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400 block">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-6 font-mono text-gray-300">
                      {user.phone || <span className="text-gray-600 italic">Not provided</span>}
                    </td>

                    {/* Role */}
                    <td className="py-4 px-6">
                      <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                        {user.role || 'user'}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={isActive ? 'success' : 'danger'} size="sm">
                          {isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </Badge>
                        {user.termsAcceptedAt || user.terms_accepted_at ? (
                          <span className="text-[10px] font-mono font-bold text-emerald-400">
                            ✓ Terms Signed
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-amber-400">
                            ⚠️ Terms Pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Created At */}
                    <td className="py-4 px-6 font-mono text-gray-400 text-[11px]">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Info */}
                        <button
                          onClick={() => onViewUser(user)}
                          title="View Full Profile"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-obsidian-700/80 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Change Role */}
                        <button
                          onClick={() => onOpenRoleModal(user)}
                          title="Change Role & Access"
                          disabled={isBusy}
                          className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/60 transition-colors disabled:opacity-40"
                        >
                          <Shield className="w-4 h-4" />
                        </button>

                        {/* Toggle Active / Suspend */}
                        <button
                          onClick={() => onToggleStatus(user)}
                          title={isActive ? 'Suspend User' : 'Reactivate User'}
                          disabled={isBusy}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            isActive
                              ? 'text-red-400 hover:text-red-300 hover:bg-red-950/60'
                              : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60'
                          }`}
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Table Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalUsers}
          limit={pageSize}
          onPageChange={onPageChange}
          onLimitChange={onPageSizeChange}
          label="users"
        />
      </div>
    </div>
  );
};

export default UserTable;
