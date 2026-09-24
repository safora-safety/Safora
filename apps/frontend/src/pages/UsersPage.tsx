import React, { useState, useEffect, useCallback } from 'react';
import { userService, UserStats } from '../services/userService';
import { User, UserRole } from '@safora/shared-types';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Search,
  RefreshCw,
  MoreVertical,
  Shield,
  UserX,
  Eye,
  Phone,
  Mail,
  HeartPulse,
  Calendar,
  AlertCircle,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>('user');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create User state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user' as UserRole,
  });
  const [createLoading, setCreateLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      showToast('Name, Email, and Password are required');
      return;
    }
    if (createForm.password.length < 8) {
      showToast('Password must be at least 8 characters');
      return;
    }
    setCreateLoading(true);
    try {
      await userService.createUser(createForm);
      showToast(`User ${createForm.name} registered successfully!`);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', phone: '', password: '', role: 'user' });
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.allSettled([
        userService.getUsers({
          search: searchQuery.trim() || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          limit: 100,
        }),
        userService.getUserStats(),
      ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.users);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch (err) {
      console.error('Failed to load user directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleUpdateRole = async () => {
    if (!roleModalUser) return;
    setActionLoadingId(roleModalUser.id);
    try {
      const updated = await userService.updateUserRole(roleModalUser.id, newSelectedRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === roleModalUser.id ? { ...u, role: updated.role } : u))
      );
      showToast(`User ${updated.name}'s role updated to ${newSelectedRole.toUpperCase()}`);
      setRoleModalUser(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = !(user.isActive ?? true);
    setActionLoadingId(user.id);
    try {
      const updated = await userService.updateUserStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: updated.isActive } : u))
      );
      showToast(`User account ${updated.name} ${newStatus ? 'activated' : 'suspended'}`);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update account status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return 'purple';
      case 'moderator':
        return 'info';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-950/90 border border-indigo-500/50 text-indigo-200 text-xs font-mono shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            User Directory & Access Control
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Manage authenticated mobile community members, assign field moderators, and configure roles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-950/40"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Staff / Citizen</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-obsidian-800 hover:bg-obsidian-700 border border-white/10 text-gray-300 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Directory</span>
          </button>
        </div>
      </div>

      {/* KPI Stats — Click to Filter Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Users"
          value={stats?.total ?? users.length}
          subtitle={roleFilter === 'all' ? 'Active filter (All users)' : 'Click to show all'}
          icon={Users}
          variant="indigo"
          onClick={() => setRoleFilter('all')}
        />
        <StatCard
          title="Security Administrators"
          value={stats?.admins ?? users.filter((u) => u.role === 'admin').length}
          subtitle={roleFilter === 'admin' ? 'Active filter (Admins)' : 'Click to filter admins'}
          icon={ShieldAlert}
          variant="danger"
          onClick={() => setRoleFilter('admin')}
        />
        <StatCard
          title="Field Moderators"
          value={stats?.moderators ?? users.filter((u) => u.role === 'moderator').length}
          subtitle={roleFilter === 'moderator' ? 'Active filter (Moderators)' : 'Click to filter moderators'}
          icon={ShieldCheck}
          variant="warning"
          onClick={() => setRoleFilter('moderator')}
        />
        <StatCard
          title="Standard Users"
          value={stats?.users ?? users.filter((u) => u.role === 'user' || !u.role).length}
          subtitle={roleFilter === 'user' ? 'Active filter (Users)' : 'Click to filter standard users'}
          icon={UserCheck}
          variant="success"
          onClick={() => setRoleFilter('user')}
        />
      </div>

      {/* Control Bar: Search & Role Filters */}
      <div className="p-4 rounded-2xl bg-obsidian-850 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 bg-obsidian-900/90 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-obsidian-900 border border-white/5 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Users' },
            { id: 'admin', label: 'Admins' },
            { id: 'moderator', label: 'Moderators' },
            { id: 'user', label: 'Members' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-obsidian-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
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
                        <Badge variant={isActive ? 'success' : 'danger'} size="sm">
                          {isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </Badge>
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
                            onClick={() => setSelectedUser(user)}
                            title="View Full Profile"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-obsidian-700/80 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Change Role */}
                          <button
                            onClick={() => {
                              setRoleModalUser(user);
                              setNewSelectedRole(user.role || 'user');
                            }}
                            title="Change Role & Access"
                            disabled={isBusy}
                            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/60 transition-colors disabled:opacity-40"
                          >
                            <Shield className="w-4 h-4" />
                          </button>

                          {/* Toggle Active / Suspend */}
                          <button
                            onClick={() => handleToggleStatus(user)}
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
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          title="Community Member Dossier"
          maxWidth="md"
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-obsidian-900 border border-white/5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-sm uppercase">
                  {selectedUser.name ? selectedUser.name.substring(0, 2) : 'US'}
                </div>
                <div>
                  <h4 className="text-white text-sm font-bold">{selectedUser.name}</h4>
                  <span className="text-gray-400 text-[11px]">{selectedUser.email}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(selectedUser.role)} size="sm">
                      {selectedUser.role || 'user'}
                    </Badge>
                    <Badge variant={selectedUser.isActive !== false ? 'success' : 'danger'} size="sm">
                      {selectedUser.isActive !== false ? 'ACTIVE' : 'SUSPENDED'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3 rounded-xl bg-obsidian-900/60 border border-white/5 flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" /> Phone:
                </span>
                <span className="text-white">{selectedUser.phone || 'Not recorded'}</span>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-900/60 border border-white/5 flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <HeartPulse className="w-3.5 h-3.5 text-red-400" /> Blood Group:
                </span>
                <span className="text-white font-bold">{selectedUser.bloodGroup || 'Not recorded'}</span>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-900/60 border border-white/5 flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Registered Since:
                </span>
                <span className="text-white">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '—'}
                </span>
              </div>
            </div>

            {selectedUser.emergencyNotes && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1">
                <span className="text-red-400 font-bold block text-[11px]">Emergency Health / SOS Notes:</span>
                <p className="text-gray-300 leading-relaxed">{selectedUser.emergencyNotes}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-obsidian-700 hover:bg-obsidian-600 text-white font-medium text-xs transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Role Elevation Modal */}
      {roleModalUser && (
        <Modal
          isOpen={Boolean(roleModalUser)}
          onClose={() => setRoleModalUser(null)}
          title={`Modify Role: ${roleModalUser.name}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-300">
              Select the administrative clearance level for this account:
            </p>

            <div className="space-y-2">
              {[
                {
                  id: 'user',
                  label: 'Community User (Standard)',
                  desc: 'Can file reports, trigger SOS, and request safe escorts.',
                },
                {
                  id: 'moderator',
                  label: 'Safety Moderator',
                  desc: 'Can verify or dismiss campus hazard reports.',
                },
                {
                  id: 'admin',
                  label: 'System Administrator',
                  desc: 'Full clearance: manage users, view telemetry, resolve alerts.',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    newSelectedRole === opt.id
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-obsidian-900 border-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.id}
                    checked={newSelectedRole === opt.id}
                    onChange={() => setNewSelectedRole(opt.id as UserRole)}
                    className="mt-1 text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-xs block text-white">{opt.label}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-3.5 py-2 rounded-xl bg-obsidian-700 hover:bg-obsidian-600 text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={actionLoadingId === roleModalUser.id}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoadingId === roleModalUser.id && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Save Role</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Citizen / Staff Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Register New Citizen or Staff Member"
          maxWidth="md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Citizen or Staff Name"
                className="w-full px-3.5 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@safora.app"
                className="w-full px-3.5 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
                Password * (min. 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Initial secure password"
                className="w-full px-3.5 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
                Role & Clearance
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="user">Standard Citizen (Mobile App Escort)</option>
                <option value="moderator">Field Moderator (Hazard Reviewer)</option>
                <option value="admin">Security Administrator (Full Access)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 rounded-xl bg-obsidian-700 hover:bg-obsidian-600 text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {createLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Create Account</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
