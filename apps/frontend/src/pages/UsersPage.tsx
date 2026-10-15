import React, { useState, useEffect, useCallback } from 'react';
import { userService, UserStats } from '../services/userService';
import { User, UserRole } from '@safora/shared-types';
import { StatCard } from '../components/common/StatCard';
import { UserTable } from '../components/users/UserTable';
import { UserDetailsModal } from '../components/users/UserDetailsModal';
import { UserRoleModal } from '../components/users/UserRoleModal';
import { CreateUserModal } from '../components/users/CreateUserModal';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Search,
  RefreshCw,
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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
          page: currentPage,
          limit: pageSize,
        }),
        userService.getUserStats(),
      ]);

      if (usersRes.status === 'fulfilled') {
        const data = usersRes.value;
        const fetchedUsers = Array.isArray(data) ? data : data.users || [];
        setUsers(fetchedUsers);
        setTotalUsers(data.total ?? fetchedUsers.length);
        setTotalPages(data.totalPages ?? (Math.ceil(fetchedUsers.length / pageSize) || 1));
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch (err) {
      console.error('Failed to load user management data:', err);
      showToast('Failed to retrieve user data');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateRole = async () => {
    if (!roleModalUser) return;
    setActionLoadingId(roleModalUser.id);
    try {
      await userService.updateUserRole(roleModalUser.id, newSelectedRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === roleModalUser.id ? { ...u, role: newSelectedRole } : u))
      );
      showToast(`User role updated to ${newSelectedRole.toUpperCase()}`);
      setRoleModalUser(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const isCurrentlyActive = user.isActive ?? true;
    const nextStatus = !isCurrentlyActive;
    setActionLoadingId(user.id);
    try {
      await userService.updateUserStatus(user.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: nextStatus } : u))
      );
      showToast(`Account ${nextStatus ? 'reactivated' : 'suspended'} successfully`);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update account status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return 'purple' as const;
      case 'moderator':
        return 'info' as const;
      default:
        return 'neutral' as const;
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
          icon={<Users className="w-5 h-5 text-indigo-400" />}
          color="indigo"
          onClick={() => setRoleFilter('all')}
        />
        <StatCard
          title="Security Administrators"
          value={stats?.admins ?? users.filter((u) => u.role === 'admin').length}
          subtitle={roleFilter === 'admin' ? 'Active filter (Admins)' : 'Click to filter admins'}
          icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
          color="red"
          onClick={() => setRoleFilter('admin')}
        />
        <StatCard
          title="Field Moderators"
          value={stats?.moderators ?? users.filter((u) => u.role === 'moderator').length}
          subtitle={roleFilter === 'moderator' ? 'Active filter (Moderators)' : 'Click to filter moderators'}
          icon={<ShieldCheck className="w-5 h-5 text-amber-400" />}
          color="amber"
          onClick={() => setRoleFilter('moderator')}
        />
        <StatCard
          title="Standard Users"
          value={stats?.users ?? users.filter((u) => u.role === 'user' || !u.role).length}
          subtitle={roleFilter === 'user' ? 'Active filter (Users)' : 'Click to filter standard users'}
          icon={<UserCheck className="w-5 h-5 text-emerald-400" />}
          color="emerald"
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
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
              onClick={() => {
                setRoleFilter(tab.id);
                setCurrentPage(1);
              }}
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
      <UserTable
        users={users}
        isLoading={isLoading}
        actionLoadingId={actionLoadingId}
        onViewUser={(user) => setSelectedUser(user)}
        onOpenRoleModal={(user) => {
          setRoleModalUser(user);
          setNewSelectedRole(user.role || 'user');
        }}
        onToggleStatus={handleToggleStatus}
        getRoleBadgeVariant={getRoleBadgeVariant}
        currentPage={currentPage}
        totalPages={totalPages}
        totalUsers={totalUsers}
        pageSize={pageSize}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(lim) => {
          setPageSize(lim);
          setCurrentPage(1);
        }}
      />

      {/* User Details Dossier Modal */}
      <UserDetailsModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        getRoleBadgeVariant={getRoleBadgeVariant}
      />

      {/* Role Elevation Modal */}
      <UserRoleModal
        user={roleModalUser}
        onClose={() => setRoleModalUser(null)}
        selectedRole={newSelectedRole}
        onSelectRole={setNewSelectedRole}
        onSaveRole={handleUpdateRole}
        isLoading={Boolean(roleModalUser && actionLoadingId === roleModalUser.id)}
      />

      {/* Add New Citizen / Staff Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
        form={createForm}
        onChangeForm={setCreateForm}
        isLoading={createLoading}
      />
    </div>
  );
};

export default UsersPage;
