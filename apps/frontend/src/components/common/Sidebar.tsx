import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Flame,
  Footprints,
  BarChart3,
  Users,
  Server,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface SidebarProps {
  activeSosCount?: number;
  unmoderatedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSosCount = 0,
  unmoderatedCount = 0,
}) => {
  const { activeEmergency } = useSocket();

  const navItems = [
    {
      to: '/',
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/sos',
      label: 'SOS Emergency Queue',
      icon: Flame,
      badge: activeEmergency || activeSosCount > 0 ? (activeSosCount || 1) : null,
      badgeVariant: 'danger',
    },
    {
      to: '/hazards',
      label: 'Hazard Moderation',
      icon: AlertTriangle,
      badge: unmoderatedCount > 0 ? unmoderatedCount : null,
      badgeVariant: 'warning',
    },
    {
      to: '/safewalks',
      label: 'Safe Walk Radar',
      icon: Footprints,
      badge: null,
    },
    {
      to: '/analytics',
      label: 'Safety Intelligence',
      icon: BarChart3,
      badge: null,
    },
    {
      to: '/users',
      label: 'User Directory',
      icon: Users,
      badge: null,
    },
    {
      to: '/diagnostics',
      label: 'System Diagnostics',
      icon: Server,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 border-r border-white/10 bg-obsidian-850/95 backdrop-blur-xl flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 z-20">
      {/* Navigation Section */}
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-500 font-semibold">
          Operational Views
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-indigo-950/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-obsidian-700/50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>

              {item.badge !== null && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    item.badgeVariant === 'danger'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Real-time Status Card at Bottom */}
      <div className="p-4 border-t border-white/10">
        <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">PostGIS Geospatial</span>
            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">Cloudinary Vault</span>
            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">Shared Backend</span>
            <span className="text-indigo-400 font-mono text-[11px]">Render Live</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
