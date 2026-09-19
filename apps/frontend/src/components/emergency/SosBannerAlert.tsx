import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Flame, AlertOctagon, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SosBannerAlert: React.FC = () => {
  const { activeEmergency, dismissEmergency } = useSocket();
  const navigate = useNavigate();

  if (!activeEmergency) return null;

  return (
    <div className="bg-red-950/90 border-b-2 border-red-500 backdrop-blur-md px-6 py-3 flex items-center justify-between text-white sticky top-16 z-40 animate-pulse-slow shadow-red-900/40 shadow-xl">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-xl bg-red-600 text-white animate-bounce">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-red-200 uppercase">
              EMERGENCY SOS DISPATCH TRIGGERED
            </span>
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-mono font-black">
              LIVE BEACON
            </span>
          </div>
          <p className="text-xs text-red-300">
            User <span className="font-semibold text-white">{activeEmergency.userName || activeEmergency.userId}</span> triggered an emergency alert at GPS [
            <span className="font-mono">{activeEmergency.latitude.toFixed(4)}, {activeEmergency.longitude.toFixed(4)}</span>
            ].
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            navigate('/sos');
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg"
        >
          <span>Respond Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={dismissEmergency}
          className="p-1.5 rounded-lg text-red-300 hover:text-white hover:bg-red-900/60 transition-colors"
          title="Dismiss Alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
