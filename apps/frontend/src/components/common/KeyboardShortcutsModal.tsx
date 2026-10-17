import React from 'react';
import { X, Command, Keyboard, Zap, Volume2, Shield } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: 'Global CAD Navigation',
      icon: Command,
      items: [
        { key: 'Ctrl + K / ⌘K', desc: 'Open Command Palette & Search' },
        { key: '?', desc: 'Show / Hide Keyboard Shortcuts' },
        { key: 'Esc', desc: 'Close Modal, Drawer, or Active Inspector' },
        { key: '/', desc: 'Quick Filter Focus in Tables' },
      ],
    },
    {
      title: 'Incident Queue & Triage',
      icon: Zap,
      items: [
        { key: 'J / ↓', desc: 'Highlight Next Incident in Queue' },
        { key: 'K / ↑', desc: 'Highlight Previous Incident in Queue' },
        { key: 'Space', desc: 'Quick-Peek Incident Details' },
        { key: 'Enter', desc: 'Open Full Incident Dossier' },
      ],
    },
    {
      title: 'Tactical Audio Player Controls',
      icon: Volume2,
      items: [
        { key: 'P', desc: 'Play / Pause Emergency Ambient Audio' },
        { key: 'C', desc: 'Toggle Voice Clarity DSP (175Hz HPF + Peaking EQ)' },
        { key: 'M', desc: 'Mute / Unmute Player Sound' },
        { key: '← / →', desc: 'Skip 5 Seconds Backward / Forward' },
      ],
    },
    {
      title: 'Dispatcher Actions & Batch Moderation',
      icon: Shield,
      items: [
        { key: 'Shift + Click', desc: 'Select continuous range of hazard reports' },
        { key: 'A', desc: 'Approve Selected Hazard Reports' },
        { key: 'D', desc: 'Mark Reports as Duplicate / Cluster' },
        { key: 'Alt + S', desc: 'Trigger Simulated Emergency Drill' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-obsidian-900 border border-white/15 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-obsidian-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Dispatcher Keyboard Shortcuts
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Linear-style keyboard-first operations manual
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-obsidian-750 hover:bg-obsidian-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {shortcutSections.map((sec) => {
            const SectionIcon = sec.icon;
            return (
              <div key={sec.title} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider text-indigo-400 uppercase">
                  <SectionIcon className="w-4 h-4" />
                  <span>{sec.title}</span>
                </div>

                <div className="space-y-2">
                  {sec.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-2 rounded-lg bg-obsidian-800/60 border border-white/5 text-xs"
                    >
                      <span className="text-gray-300 font-medium">{item.desc}</span>
                      <kbd className="px-2 py-0.5 rounded text-[11px] font-mono text-white bg-obsidian-700 border border-white/15 shadow-sm ml-2 shrink-0">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-obsidian-850 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 font-mono">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-obsidian-750 border border-white/10 text-white">?</kbd> anywhere to toggle this guide</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
