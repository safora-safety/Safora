import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, ExternalLink } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl?: string;
  title?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title = 'Ambient Emergency Audio Evidence',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('00:00');
  const [duration, setDuration] = useState('00:30');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        const mins = Math.floor(audio.currentTime / 60);
        const secs = Math.floor(audio.currentTime % 60);
        setCurrentTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        const mins = Math.floor(audio.duration / 60);
        const secs = Math.floor(audio.duration % 60);
        setDuration(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime('00:00');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const seekTime = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
    audioRef.current.currentTime = seekTime;
    setProgress(parseFloat(e.target.value));
  };

  if (!audioUrl) {
    return (
      <div className="p-3 rounded-xl bg-obsidian-700/40 border border-white/5 text-xs text-gray-400 flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-gray-500" />
        <span>No audio evidence attached to this alert.</span>
      </div>
    );
  }

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loadError, setLoadError] = useState(false);

  const togglePlaybackSpeed = () => {
    if (!audioRef.current) return;
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  return (
    <div className="p-4 rounded-xl bg-obsidian-700/60 border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-gray-200 tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlaybackSpeed}
            className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-gray-300 transition-colors"
            title="Adjust Audio Playback Speed"
          >
            {playbackSpeed}x
          </button>
          <a
            href={audioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            Direct Link <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onError={() => setLoadError(true)}
      />

      {loadError ? (
        <div className="text-xs text-amber-400 py-1 font-mono">
          ⚠️ Unable to stream audio directly. Use Direct Link above.
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
          </button>

          <div className="flex-1 space-y-1">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="w-full h-1.5 bg-obsidian-900 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[11px] font-mono text-gray-400">
              <span>{currentTime}</span>
              <span>{duration}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
