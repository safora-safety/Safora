import React from 'react';
import { Modal } from '../common/Modal';
import { User, UserRole } from '@safora/shared-types';
import { RefreshCw } from 'lucide-react';

interface UserRoleModalProps {
  user: User | null;
  onClose: () => void;
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onSaveRole: () => void;
  isLoading: boolean;
}

const ROLE_OPTIONS = [
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
];

export const UserRoleModal: React.FC<UserRoleModalProps> = ({
  user,
  onClose,
  selectedRole,
  onSelectRole,
  onSaveRole,
  isLoading,
}) => {
  if (!user) return null;

  return (
    <Modal
      isOpen={Boolean(user)}
      onClose={onClose}
      title={`Modify Role: ${user.name}`}
      maxWidth="sm"
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-300">
          Select the administrative clearance level for this account:
        </p>

        <div className="space-y-2">
          {ROLE_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selectedRole === opt.id
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                  : 'bg-obsidian-900 border-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={opt.id}
                checked={selectedRole === opt.id}
                onChange={() => onSelectRole(opt.id as UserRole)}
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
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-obsidian-700 hover:bg-obsidian-600 text-white text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSaveRole}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Role</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UserRoleModal;
