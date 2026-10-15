import React from 'react';
import { Modal } from '../common/Modal';
import { UserRole } from '@safora/shared-types';
import { RefreshCw } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
  };
  onChangeForm: (updated: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
  }) => void;
  isLoading: boolean;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  onChangeForm,
  isLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Citizen or Staff Member"
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => onChangeForm({ ...form, name: e.target.value })}
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
            value={form.email}
            onChange={(e) => onChangeForm({ ...form, email: e.target.value })}
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
            value={form.phone}
            onChange={(e) => onChangeForm({ ...form, phone: e.target.value })}
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
            value={form.password}
            onChange={(e) => onChangeForm({ ...form, password: e.target.value })}
            placeholder="Initial secure password"
            className="w-full px-3.5 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
            Role & Clearance
          </label>
          <select
            value={form.role}
            onChange={(e) => onChangeForm({ ...form, role: e.target.value as UserRole })}
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
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-obsidian-700 hover:bg-obsidian-600 text-white text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Create Account</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;
