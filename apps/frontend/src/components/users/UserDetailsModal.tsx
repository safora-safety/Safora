import React from 'react';
import { Modal } from '../common/Modal';
import { Badge, BadgeVariant } from '../common/Badge';
import { User, UserRole } from '@safora/shared-types';
import {
  Phone,
  HeartPulse,
  Calendar,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface UserDetailsModalProps {
  user: User | null;
  onClose: () => void;
  getRoleBadgeVariant: (role?: UserRole) => BadgeVariant;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  onClose,
  getRoleBadgeVariant,
}) => {
  if (!user) return null;

  return (
    <Modal
      isOpen={Boolean(user)}
      onClose={onClose}
      title="Community Member Dossier"
      maxWidth="md"
    >
      <div className="space-y-4 font-mono text-xs">
        <div className="p-4 rounded-xl bg-obsidian-900 border border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-sm uppercase">
              {user.name ? user.name.substring(0, 2) : 'US'}
            </div>
            <div>
              <h4 className="text-white text-sm font-bold">{user.name}</h4>
              <span className="text-gray-400 text-[11px]">{user.email}</span>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                  {user.role || 'user'}
                </Badge>
                <Badge variant={user.isActive !== false ? 'success' : 'danger'} size="sm">
                  {user.isActive !== false ? 'ACTIVE' : 'SUSPENDED'}
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
            <span className="text-white">{user.phone || 'Not recorded'}</span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-900/60 border border-white/5 flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-2">
              <HeartPulse className="w-3.5 h-3.5 text-red-400" /> Blood Group:
            </span>
            <span className="text-white font-bold">{user.bloodGroup || 'Not recorded'}</span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-900/60 border border-white/5 flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Registered Since:
            </span>
            <span className="text-white">
              {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-900/60 border border-white/5 flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Safety Terms & Privacy:
            </span>
            {user.termsAcceptedAt || user.terms_accepted_at ? (
              <span className="text-emerald-400 font-mono text-[11px] font-bold flex items-center gap-1">
                ✓ Signed ({new Date(user.termsAcceptedAt || user.terms_accepted_at!).toLocaleDateString()})
              </span>
            ) : (
              <span className="text-amber-400 font-mono text-[11px] font-bold">
                ⚠️ Pending / Not Signed
              </span>
            )}
          </div>

          {user.age != null && (
            <div className="p-3 rounded-xl bg-obsidian-900/60 border border-white/5 flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Confirmed Age:
              </span>
              <span className="text-white font-mono font-bold">
                {user.age} years old {user.age < 18 ? '(Under 18)' : ''}
              </span>
            </div>
          )}
        </div>

        {user.emergencyNotes && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1">
            <span className="text-red-400 font-bold block text-[11px]">Emergency Health / SOS Notes:</span>
            <p className="text-gray-300 leading-relaxed">{user.emergencyNotes}</p>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-obsidian-700 hover:bg-obsidian-600 text-white font-medium text-xs transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UserDetailsModal;
