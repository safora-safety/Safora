import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Radio,
  Flame,
  Footprints,
  AlertTriangle,
  Activity,
  BarChart3,
  Users,
  Settings,
  Sparkles,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Command,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteAction {
  id: string;
  category: 'Navigation' | 'Tactical Actions' | 'Filters & Tools';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey?: string;
  onSelect: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { broadcastTestSos } = useSocket();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const actions: PaletteAction[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Operations Dashboard',
      subtitle: 'Living GIS command map & live incident feeds',
      icon: Activity,
      hotkey: 'G D',
      onSelect: () => {
        navigate('/');
        onClose();
      },
    },
    {
      id: 'nav-sos',
      category: 'Navigation',
      title: 'Active SOS Alerts & Evidence',
      subtitle: 'Real-time emergency audio player & live GPS coordinates',
      icon: Flame,
      hotkey: 'G S',
      onSelect: () => {
        navigate('/sos');
        onClose();
      },
    },
    {
      id: 'nav-safewalks',
      category: 'Navigation',
      title: 'Safe Walk Escort Radar',
      subtitle: 'Active pedestrian corridors & deviation timers',
      icon: Footprints,
      hotkey: 'G W',
      onSelect: () => {
        navigate('/safewalks');
        onClose();
      },
    },
    {
      id: 'nav-hazards',
      category: 'Navigation',
      title: 'Hazard Moderation Queue',
      subtitle: 'Batch review unlit roads, flooding & community hazard pins',
      icon: AlertTriangle,
      hotkey: 'G H',
      onSelect: () => {
        navigate('/hazards');
        onClose();
      },
    },
    {
      id: 'nav-diagnostics',
      category: 'Navigation',
      title: 'System Diagnostics & Telemetry',
      subtitle: 'Database latency, WebSocket health & Cloudinary queues',
      icon: Radio,
      hotkey: 'G T',
      onSelect: () => {
        navigate('/diagnostics');
        onClose();
      },
    },
    {
      id: 'nav-analytics',
      category: 'Navigation',
      title: 'Safety Intelligence & Heatmaps',
      subtitle: 'DBSCAN incident clusters & safety decay reports',
      icon: BarChart3,
      onSelect: () => {
        navigate('/analytics');
        onClose();
      },
    },
    {
      id: 'nav-users',
      category: 'Navigation',
      title: 'User & Guardian Management',
      subtitle: 'Inspect student accounts & emergency contact bindings',
      icon: Users,
      onSelect: () => {
        navigate('/users');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Command Settings & Hotkeys',
      subtitle: 'Configure audio gain, polling frequency & notification chimes',
      icon: Settings,
      onSelect: () => {
        navigate('/settings');
        onClose();
      },
    },

    // Tactical Actions
    {
      id: 'act-sos-drill',
      category: 'Tactical Actions',
      title: 'Simulate Emergency SOS Drill',
      subtitle: 'Broadcast simulated SOS beacon to test operator alert chimes',
      icon: ShieldAlert,
      hotkey: 'Alt + S',
      onSelect: () => {
        broadcastTestSos(30.3165, 78.0322);
        onClose();
      },
    },
    {
      id: 'act-voice-dsp',
      category: 'Tactical Actions',
      title: 'Toggle Voice Clarity DSP',
      subtitle: 'Enable or disable 175Hz High-Pass & 2.4kHz Speech Peaking EQ',
      icon: Sparkles,
      hotkey: 'C',
      onSelect: () => {
        try {
          const current = localStorage.getItem('safora_voice_clarity') !== 'false';
          localStorage.setItem('safora_voice_clarity', String(!current));
        } catch {}
        onClose();
      },
    },

    // Filters & Tools
    {
      id: 'flt-critical',
      category: 'Filters & Tools',
      title: 'Filter: Unresolved Critical SOS Beacons',
      subtitle: 'Jump to SOS queue filtered by active distress status',
      icon: Flame,
      onSelect: () => {
        navigate('/sos?status=active');
        onClose();
      },
    },
    {
      id: 'flt-unlit',
      category: 'Filters & Tools',
      title: 'Filter: Dark & Broken Streetlights',
      subtitle: 'Inspect pending lighting hazard reports',
      icon: AlertTriangle,
      onSelect: () => {
        navigate('/hazards?category=lighting');
        onClose();
      },
    },
  ];

  const filteredActions = actions.filter((act) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      act.title.toLowerCase().includes(q) ||
      act.subtitle.toLowerCase().includes(q) ||
      act.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-obsidian-900 border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-obsidian-850">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, jump to page, or search actions... (Esc to exit)"
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-obsidian-750 border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm font-mono">
              No matching commands or actions found for "{query}"
            </div>
          ) : (
            filteredActions.map((act, index) => {
              const Icon = act.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={act.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                      : 'text-gray-300 hover:bg-obsidian-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-obsidian-750 text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-2">
                        <span>{act.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-obsidian-750 border border-white/5 text-gray-400">
                          {act.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">
                        {act.subtitle}
                      </div>
                    </div>
                  </div>

                  {act.hotkey ? (
                    <kbd className="hidden sm:inline-flex items-center px-2 py-1 rounded text-[10px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 shrink-0 ml-3">
                      {act.hotkey}
                    </kbd>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500 shrink-0 ml-3" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-obsidian-850 border-t border-white/10 text-[11px] text-gray-400 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Command className="w-3 h-3" />
            <span>SAFORA CAD Command Bar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
