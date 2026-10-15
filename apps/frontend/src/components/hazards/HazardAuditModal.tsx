import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { HazardReport } from '@safora/shared-types';
import { MapPin } from 'lucide-react';

interface HazardAuditModalProps {
  target: HazardReport | null;
  onClose: () => void;
}

export const HazardAuditModal: React.FC<HazardAuditModalProps> = ({
  target,
  onClose,
}) => {
  if (!target) return null;

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={onClose}
      title="Community Verification & Reporter Audit"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs font-sans">
        <div className="p-3 rounded-xl bg-obsidian-900 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">{target.title}</span>
            <Badge
              variant={
                target.status === 'active'
                  ? 'warning'
                  : target.status === 'resolved'
                  ? 'success'
                  : 'danger'
              }
              size="sm"
            >
              {target.status}
            </Badge>
          </div>
          <p className="text-gray-300">{target.description || 'No description provided.'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-gray-300 font-mono">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-gray-500 block">REPORTER IDENTITY</span>
            <span className="text-white font-semibold">{target.reporterName || 'SAFORA Citizen'}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-gray-500 block">COMMUNITY CONFIRMATIONS</span>
            <span className="text-emerald-400 font-bold text-sm">
              {target.confirmationsCount || 0} Citizens Verified
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-gray-500 block">COORDINATES</span>
            <span className="text-white">
              {target.latitude.toFixed(4)}, {target.longitude.toFixed(4)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-gray-500 block">REPORTED TIMESTAMP</span>
            <span className="text-white">
              {new Date(target.createdAt || Date.now()).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <a
            href={`https://maps.google.com/?q=${target.latitude},${target.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 font-mono text-[11px]"
          >
            <MapPin className="w-3.5 h-3.5" /> View on Google Maps
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs"
          >
            Close Audit
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default HazardAuditModal;
