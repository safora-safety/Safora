import React, { useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { HazardReport } from '@safora/shared-types';
import { HazardMarker } from './HazardMarker';
import { SosBeacon } from './SosBeacon';
import { Maximize2, Layers } from 'lucide-react';

interface LiveCommandMapProps {
  hazards?: HazardReport[];
  sosAlerts?: any[];
  center?: [number, number];
  zoom?: number;
  onInspectPhoto?: (url: string) => void;
  onSelectSos?: (sos: any) => void;
}

// Controller to smoothly pan to center on coordinate updates
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export const LiveCommandMap: React.FC<LiveCommandMapProps> = ({
  hazards = [],
  sosAlerts = [],
  center = [30.3165, 78.0322], // Standard campus coordinates
  zoom = 14,
  onInspectPhoto,
  onSelectSos,
}) => {
  const [tileMode, setTileMode] = useState<'matrix' | 'tactical' | 'satellite' | 'osm'>('matrix');

  const tileConfigs: Record<
    'matrix' | 'tactical' | 'satellite' | 'osm',
    { url: string; attribution: string; className?: string; label: string; maxZoom?: number }
  > = {
    matrix: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | SAFORA Operations',
      className: 'dark-matrix-tiles',
      label: 'Dark Matrix',
      maxZoom: 19,
    },
    tactical: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, DeLorme, NAVTEQ | SAFORA Operations',
      className: '',
      label: 'Tactical Gray',
      maxZoom: 18,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, Maxar | SAFORA Operations',
      className: '',
      label: 'Satellite',
      maxZoom: 18,
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | SAFORA Operations',
      className: '',
      label: 'Street Map',
      maxZoom: 19,
    },
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={3}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ minHeight: '420px', background: '#070A11' }}
      >
        <MapCenterController center={center} />
        <TileLayer
          key={tileMode}
          attribution={tileConfigs[tileMode].attribution}
          url={tileConfigs[tileMode].url}
          className={tileConfigs[tileMode].className}
          maxZoom={tileConfigs[tileMode].maxZoom}
          minZoom={3}
          noWrap={true}
          bounds={[[-85, -180], [85, 180]]}
        />

        {/* Hazard Incident Pins */}
        {hazards.map((hazard) => (
          <HazardMarker
            key={`hazard-${hazard.id}`}
            report={hazard}
            onInspectPhoto={onInspectPhoto}
          />
        ))}

        {/* Emergency SOS Pulsing Beacons */}
        {sosAlerts.map((sos) => (
          <SosBeacon
            key={`sos-${sos.id || sos.alertId}`}
            id={sos.id || sos.alertId}
            latitude={Number(sos.latitude)}
            longitude={Number(sos.longitude)}
            userName={sos.senderName || sos.userName || 'Emergency Alert'}
            batteryPercentage={sos.batteryPercentage}
            audioUrl={sos.audioUrl}
            createdAt={sos.createdAt || sos.timestamp}
            onSelect={() => onSelectSos && onSelectSos(sos)}
          />
        ))}
      </MapContainer>

      {/* Floating Tactical Layer Selector Controls */}
      <div className="absolute top-4 right-4 z-[400] flex items-center gap-1 p-1 rounded-xl bg-obsidian-850/95 backdrop-blur-md border border-white/10 shadow-xl">
        <div className="flex items-center gap-1 px-1.5 text-gray-400">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        {(['matrix', 'tactical', 'satellite', 'osm'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setTileMode(mode)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all ${
              tileMode === mode
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tileConfigs[mode].label}
          </button>
        ))}
      </div>

      {/* Live Map Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-obsidian-850/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
          <span className="text-gray-300 font-medium">SOS Beacon</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="text-gray-300 font-medium">Lighting / Road Hazard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
          <span className="text-gray-300 font-medium">Waterlogging</span>
        </div>
      </div>
    </div>
  );
};
