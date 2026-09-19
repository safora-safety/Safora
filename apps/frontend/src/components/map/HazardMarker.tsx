import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { HazardReport } from '@safora/shared-types';
import { Badge } from '../common/Badge';

interface HazardMarkerProps {
  report: HazardReport;
  onInspectPhoto?: (url: string) => void;
}

export const HazardMarker: React.FC<HazardMarkerProps> = ({ report, onInspectPhoto }) => {
  // Category color mapping
  const categoryColor: Record<string, string> = {
    lighting: '#F59E0B',      // Amber
    road_hazard: '#EF4444',   // Red
    waterlogging: '#06B6D4',  // Cyan
    isolated_area: '#8B5CF6', // Purple
    traffic: '#EC4899',       // Pink
    other: '#9CA3AF',         // Gray
  };

  const color = categoryColor[report.category] || '#F59E0B';

  // Custom SVG Leaflet Icon
  const customIcon = L.divIcon({
    className: 'custom-hazard-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

  return (
    <Marker position={[report.latitude, report.longitude]} icon={customIcon}>
      <Popup>
        <div className="p-1 max-w-xs space-y-2 text-gray-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 font-bold">
              {report.category.replace('_', ' ')}
            </span>
            <Badge
              variant={
                report.status === 'active'
                  ? 'warning'
                  : report.status === 'resolved'
                  ? 'success'
                  : 'neutral'
              }
              size="sm"
            >
              {report.status}
            </Badge>
          </div>

          <h4 className="text-sm font-bold text-white leading-snug">{report.title}</h4>
          {report.description && (
            <p className="text-xs text-gray-300 line-clamp-2">{report.description}</p>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px] text-gray-400">
            <span>Severity: <strong className="text-amber-400">{report.severity}/5</strong></span>
            <span>Confirmations: <strong className="text-emerald-400">{report.confirmationsCount || 0}</strong></span>
          </div>

          {report.photoUrl && (
            <div className="pt-1">
              <img
                src={report.photoUrl}
                alt="Hazard Photo"
                onClick={() => onInspectPhoto && onInspectPhoto(report.photoUrl!)}
                className="w-full h-24 object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
              />
              <span className="text-[10px] text-gray-400 block text-center mt-1">Click image to enlarge</span>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};
