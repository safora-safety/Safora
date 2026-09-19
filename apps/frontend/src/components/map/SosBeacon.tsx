import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface SosBeaconProps {
  id: string | number;
  latitude: number;
  longitude: number;
  userName?: string;
  batteryPercentage?: number;
  audioUrl?: string;
  createdAt?: string;
  onSelect?: () => void;
}

export const SosBeacon: React.FC<SosBeaconProps> = ({
  latitude,
  longitude,
  userName = 'Emergency Citizen',
  batteryPercentage,
  audioUrl,
  createdAt,
  onSelect,
}) => {
  const customIcon = L.divIcon({
    className: 'custom-sos-beacon',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <span style="
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.4);
          animation: beaconPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <span style="
          position: relative;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #EF4444;
          border: 2px solid #FFFFFF;
          box-shadow: 0 0 14px #EF4444;
        "></span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

  return (
    <Marker position={[latitude, longitude]} icon={customIcon}>
      <Popup>
        <div className="p-1 max-w-xs space-y-2 text-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold">
              ACTIVE SOS BEACON
            </span>
          </div>

          <h4 className="text-sm font-bold text-white">{userName}</h4>

          <div className="text-xs text-gray-300 space-y-1">
            <div>
              GPS: <span className="font-mono text-gray-200">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
            </div>
            {batteryPercentage !== undefined && (
              <div>
                Battery Telemetry: <span className="font-mono font-bold text-amber-400">{batteryPercentage}%</span>
              </div>
            )}
            {createdAt && (
              <div className="text-[11px] text-gray-400">
                Dispatched: {new Date(createdAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {audioUrl && (
            <div className="pt-1 text-[11px] text-indigo-400">
              Audio evidence attached
            </div>
          )}

          {onSelect && (
            <button
              onClick={onSelect}
              className="w-full mt-2 py-1 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
            >
              Open Dispatch Queue
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
};
