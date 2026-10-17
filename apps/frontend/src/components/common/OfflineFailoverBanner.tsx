import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface OfflineFailoverBannerProps {
  onManualReconnect?: () => void;
  isOfflineOverride?: boolean;
}

export const OfflineFailoverBanner: React.FC<OfflineFailoverBannerProps> = ({
  onManualReconnect,
  isOfflineOverride,
}) => {
  const { isConnected } = useSocket();
  const effectiveConnected = isOfflineOverride !== undefined ? !isOfflineOverride : isConnected;

  if (effectiveConnected) return null;

  const handleForceReconnect = () => {
    if (onManualReconnect) {
      onManualReconnect();
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      role="alert"
      className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-amber-200 text-xs font-mono flex items-center justify-between sticky top-16 z-20 backdrop-blur-md animate-fade-in"
    >
      <div className="flex items-center gap-2.5">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <div>
          <span className="font-bold text-amber-300">
            ⚠️ Real-Time Dispatch Connection Interrupted:
          </span>{' '}
          Reconnecting to live WebSocket grid... Displaying verified local cache.
        </div>
      </div>

      <button
        type="button"
        onClick={handleForceReconnect}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white transition-colors text-[11px] font-semibold shrink-0 ml-3"
      >
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Reconnect Now</span>
      </button>
    </div>
  );
};
