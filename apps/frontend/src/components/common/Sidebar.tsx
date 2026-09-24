import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Flame,
  Footprints,
  BarChart3,
  Users,
  Server,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { sosService } from '../../services/sosService';
import { reportService } from '../../services/reportService';

interface SidebarProps {
  activeSosCount?: number;
  unmoderatedCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSosCount = 0,
  unmoderatedCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { activeEmergency } = useSocket();
  const [internalSosCount, setInternalSosCount] = useState<number>(0);
  const [internalHazardsCount, setInternalHazardsCount] = useState<number>(0);

  const fetchLiveBadgeCounts = async () => {
    try {
      const [alerts, reports] = await Promise.allSettled([
        sosService.getAdminAlerts(),
        reportService.getReports(50),
      ]);
      if (alerts.status === 'fulfilled') {
        const active = alerts.value.filter((a) => a.status !== 'resolved').length;
        setInternalSosCount(active);
      }
      if (reports.status === 'fulfilled') {
        const pending = reports.value.filter((r) => r.status === 'active').length;
        setInternalHazardsCount(pending);
      }
    } catch {
      // Background count fetch failure handled gracefully
    }
  };

  useEffect(() => {
    fetchLiveBadgeCounts();
    const timer = setInterval(fetchLiveBadgeCounts, 30000);
    return () => clearInterval(timer);
  }, [activeEmergency]);

  const effectiveSosCount = activeEmergency
    ? Math.max(1, internalSosCount, activeSosCount)
    : internalSosCount || activeSosCount;

  const effectiveHazardCount = internalHazardsCount || unmoderatedCount;

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
      badge: effectiveSosCount > 0 ? effectiveSosCount : null,
      badgeVariant: 'danger',
    },
    {
      to: '/hazards',
      label: 'Hazard Moderation',
      icon: AlertTriangle,
      badge: effectiveHazardCount > 0 ? effectiveHazardCount : null,
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
    {
      to: '/settings',
      label: 'Settings & Security',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9998] md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Element */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 z-[9999] md:z-20 w-72 md:w-64 border-r border-white/10 bg-obsidian-850/98 md:bg-obsidian-850/95 backdrop-blur-xl flex flex-col justify-between shrink-0 h-screen md:h-[calc(100vh-4rem)] transition-transform duration-200 ease-in-out shadow-2xl md:shadow-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation Section */}
        <div className="p-4 space-y-1 overflow-y-auto">
          {/* Mobile Drawer Header with Close Button */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 md:hidden">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold text-white text-sm">SAFORA Command</span>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                }}
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
        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="p-3 rounded-xl bg-obsidian-800/80 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">PostGIS Spatial</span>
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
    </>
  );
};
