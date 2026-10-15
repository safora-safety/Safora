import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

interface HazardFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onReset: () => void;
}

export const HazardFilters: React.FC<HazardFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  onReset,
}) => {
  const hasActiveFilters =
    selectedCategory !== 'all' || selectedStatus !== 'all' || searchTerm.trim().length > 0;

  return (
    <div className="p-4 rounded-2xl bg-obsidian-850 border border-white/10 flex flex-wrap gap-4 items-center justify-between">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search by title, description, or reporter..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-obsidian-900 border border-white/10 focus:border-indigo-500 text-sm text-white placeholder-gray-500 outline-none"
        />
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-3 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white outline-none"
        >
          <option value="all">All Categories</option>
          <option value="lighting">Poor Lighting</option>
          <option value="road_hazard">Road Hazard</option>
          <option value="waterlogging">Waterlogging</option>
          <option value="isolated_area">Isolated Area</option>
          <option value="traffic">Heavy Traffic</option>
          <option value="other">Other</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active / Pending</option>
          <option value="resolved">Resolved</option>
          <option value="fake">Flagged Fake</option>
          <option value="duplicate">Duplicate</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1"
            title="Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default HazardFilters;
