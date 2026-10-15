import React from 'react';
import { Modal } from '../common/Modal';
import { CheckCircle } from 'lucide-react';

interface HazardResolutionModalProps {
  target: {
    id?: string | number;
    isBatch?: boolean;
    title?: string;
  } | null;
  onClose: () => void;
  notes: string;
  onChangeNotes: (notes: string) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

const PRESETS = [
  'Repaired by Municipal Maintenance crew',
  'Hazard cleared & corridor verified safe',
  'Lighting restored to standard intensity',
  'Road obstacle removed by traffic police',
  'False alarm / cleared on physical patrol',
];

export const HazardResolutionModal: React.FC<HazardResolutionModalProps> = ({
  target,
  onClose,
  notes,
  onChangeNotes,
  onConfirm,
  isSubmitting,
}) => {
  if (!target) return null;

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={onClose}
      title={`Resolve Hazard: ${target.title || ''}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-400">
          Document dispatch action, municipal maintenance report, or verification details for auditing and citizen visibility:
        </p>

        <div>
          <label className="block text-xs font-mono text-gray-300 mb-1.5">
            Resolution Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="e.g. Streetlight luminaire replaced by municipal electric dept. Tested operational."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-white/10 focus:border-indigo-500 text-xs text-white placeholder-gray-500 outline-none resize-none"
          />
        </div>

        {/* Quick preset chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono text-gray-400">Quick Presets:</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChangeNotes(preset)}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-gray-300 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Confirm Resolution'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default HazardResolutionModal;
