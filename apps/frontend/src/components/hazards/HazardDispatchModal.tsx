import React from 'react';
import { Modal } from '../common/Modal';
import { PlusCircle } from 'lucide-react';

interface HazardDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  onChangeTitle: (title: string) => void;
  category: string;
  onChangeCategory: (category: string) => void;
  severity: number;
  onChangeSeverity: (severity: number) => void;
  latitude: string;
  onChangeLatitude: (lat: string) => void;
  longitude: string;
  onChangeLongitude: (lng: string) => void;
  description: string;
  onChangeDescription: (desc: string) => void;
  isSubmitting: boolean;
}

export const HazardDispatchModal: React.FC<HazardDispatchModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  onChangeTitle,
  category,
  onChangeCategory,
  severity,
  onChangeSeverity,
  latitude,
  onChangeLatitude,
  longitude,
  onChangeLongitude,
  description,
  onChangeDescription,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official City Hazard Pin Dispatch"
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
            Hazard Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="e.g., Non-functional Streetlight, Open Trench"
            className="w-full px-3 py-2 bg-obsidian-900 border border-white/10 rounded-xl text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => onChangeCategory(e.target.value)}
              className="w-full px-3 py-2 bg-obsidian-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
            >
              <option value="lighting">Poor Lighting</option>
              <option value="road_hazard">Road Hazard</option>
              <option value="waterlogging">Waterlogging</option>
              <option value="isolated_area">Isolated Area</option>
              <option value="traffic">Heavy Traffic</option>
              <option value="other">Other Hazard</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
              Severity Level: <span className="text-amber-400 font-bold">{severity} / 5</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={severity}
              onChange={(e) => onChangeSeverity(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-obsidian-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
              Latitude *
            </label>
            <input
              type="number"
              step="any"
              required
              value={latitude}
              onChange={(e) => onChangeLatitude(e.target.value)}
              className="w-full px-3 py-2 bg-obsidian-900 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
              Longitude *
            </label>
            <input
              type="number"
              step="any"
              required
              value={longitude}
              onChange={(e) => onChangeLongitude(e.target.value)}
              className="w-full px-3 py-2 bg-obsidian-900 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Quick Coordinate Helpers */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 font-mono">Quick Set:</span>
          <button
            type="button"
            onClick={() => {
              onChangeLatitude('30.3165');
              onChangeLongitude('78.0322');
            }}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-indigo-300 font-mono border border-white/5"
          >
            📍 Dehradun City (30.3165, 78.0322)
          </button>
          <button
            type="button"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  onChangeLatitude(pos.coords.latitude.toFixed(6));
                  onChangeLongitude(pos.coords.longitude.toFixed(6));
                });
              }
            }}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-emerald-300 font-mono border border-white/5"
          >
            🎯 My Location
          </button>
        </div>

        <div>
          <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
            Description / Dispatch Directives (Optional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder="e.g., Reported by municipal field patrol; verified broken halogen street lamp near university campus road."
            className="w-full px-3 py-2 bg-obsidian-900 border border-white/10 rounded-xl text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Hazard Pin'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default HazardDispatchModal;
