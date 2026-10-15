import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSeekingRef = useRef(false);

  const formatSeconds = (sec: number): string => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Reset when audioUrl changes (e.g., clicking another alert in the queue)
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime('00:00');
    setLoadError(false);
    isSeekingRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [audioUrl]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      // Never overwrite the progress bar if the user is currently dragging or holding the seek slider
      if (isSeekingRef.current) return;

      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : 30;
      if (dur > 0) {
        setProgress((audio.currentTime / dur) * 100);
        setCurrentTime(formatSeconds(audio.currentTime));
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(formatSeconds(audio.duration));
      } else {
        setDuration('00:30');
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime('00:00');
      isSeekingRef.current = false;
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
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  // Skip forward or backward by delta seconds (e.g. -5s or +5s)
  const skipTime = useCallback((deltaSec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration && isFinite(audio.duration) ? audio.duration : 30;
    const target = Math.max(0, Math.min(dur, audio.currentTime + deltaSec));
    audio.currentTime = target;
    setProgress((target / dur) * 100);
    setCurrentTime(formatSeconds(target));
  }, []);

  // Slider scrub handler — updates preview smoothly without jerkiness
  const handleSliderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    isSeekingRef.current = true;
    const val = parseFloat(e.target.value);
    setProgress(val);

    const audio = audioRef.current;
    const dur = audio && audio.duration && isFinite(audio.duration) ? audio.duration : 30;
    const previewTime = (val / 100) * dur;
    setCurrentTime(formatSeconds(previewTime));
  };

  // Commit seek position once thumb is released
  const commitSeek = (val: number) => {
    const audio = audioRef.current;
    if (audio) {
      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : 30;
      const targetTime = (val / 100) * dur;
      audio.currentTime = targetTime;
    }
    // Small timeout ensures timeupdate doesn't capture intermediate drag value
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 50);
  };

  const togglePlaybackSpeed = () => {
    if (!audioRef.current) return;
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
      if (v === 0) {
        audioRef.current.muted = true;
        setIsMuted(true);
      } else {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  if (!audioUrl) {
    return (
      <div className="p-3 rounded-xl bg-obsidian-700/40 border border-white/5 text-xs text-gray-400 flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-gray-500" />
        <span>No audio evidence attached to this alert.</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-obsidian-700/60 border border-white/10 space-y-3 shadow-lg">
      {/* Header with Title & Meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-xs font-semibold text-gray-200 tracking-wide">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
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
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            Direct Link <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        crossOrigin="anonymous"
        onError={() => setLoadError(true)}
      />

      {loadError ? (
        <div className="text-xs text-amber-400 py-1 font-mono">
          ⚠️ Unable to stream audio directly. Use Direct Link above.
        </div>
      ) : (
        <div className="space-y-2">
          {/* Main Controls Row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors flex-shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 translate-x-0.5" />
              )}
            </button>

            {/* Jump -5s */}
            <button
              onClick={() => skipTime(-5)}
              className="p-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-600 text-gray-300 hover:text-white transition-colors flex items-center gap-0.5 text-[11px] font-mono border border-white/5"
              title="Rewind 5 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>-5s</span>
            </button>

            {/* Jump +5s */}
            <button
              onClick={() => skipTime(5)}
              className="p-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-600 text-gray-300 hover:text-white transition-colors flex items-center gap-0.5 text-[11px] font-mono border border-white/5"
              title="Forward 5 seconds"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>+5s</span>
            </button>

            {/* Scrub Slider & Timestamps */}
            <div className="flex-1 space-y-1">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleSliderInput}
                onMouseUp={(e) => commitSeek(parseFloat((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => commitSeek(parseFloat((e.target as HTMLInputElement).value))}
                onKeyUp={(e) => commitSeek(parseFloat((e.target as HTMLInputElement).value))}
                className="w-full h-1.5 bg-obsidian-900 rounded-lg appearance-none cursor-pointer accent-red-500 hover:h-2 transition-all"
              />
              <div className="flex justify-between text-[11px] font-mono text-gray-400">
                <span className="text-gray-200">{currentTime}</span>
                <span>{duration}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              <button
                onClick={toggleMute}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gray-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-obsidian-900 rounded-lg appearance-none cursor-pointer accent-gray-400"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
