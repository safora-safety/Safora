import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  RotateCcw,
  RotateCw,
  Sparkles,
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

  // Phase 2: Web Audio Voice Clarity & Noise Reduction DSP
  const [isVoiceClarityEnabled, setIsVoiceClarityEnabled] = useState(() => {
    try {
      return localStorage.getItem('safora_voice_clarity') !== 'false';
    } catch {
      return true;
    }
  });

  const playerAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const highPassNodeRef = useRef<BiquadFilterNode | null>(null);
  const peakingNodeRef = useRef<BiquadFilterNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);

  const applyDspFilterParams = useCallback((enabled: boolean) => {
    const ctx = playerAudioCtxRef.current;
    const hpf = highPassNodeRef.current;
    const peak = peakingNodeRef.current;
    const comp = compressorNodeRef.current;
    if (!ctx || !hpf || !peak || !comp) return;

    const now = ctx.currentTime;
    if (enabled) {
      hpf.frequency.setValueAtTime(175, now);
      hpf.Q.setValueAtTime(0.707, now);

      peak.frequency.setValueAtTime(2400, now);
      peak.Q.setValueAtTime(1.1, now);
      peak.gain.setValueAtTime(3.5, now);

      comp.threshold.setValueAtTime(-24, now);
      comp.knee.setValueAtTime(12, now);
      comp.ratio.setValueAtTime(4, now);
      comp.attack.setValueAtTime(0.003, now);
      comp.release.setValueAtTime(0.25, now);
    } else {
      hpf.frequency.setValueAtTime(20, now);
      peak.gain.setValueAtTime(0, now);
      comp.threshold.setValueAtTime(0, now);
      comp.ratio.setValueAtTime(1, now);
    }
  }, []);

  const initWebAudioDsp = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || mediaElementSourceRef.current) {
      if (playerAudioCtxRef.current && playerAudioCtxRef.current.state === 'suspended') {
        playerAudioCtxRef.current.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      playerAudioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audio);
      mediaElementSourceRef.current = source;

      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      highPassNodeRef.current = hpf;

      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking';
      peakingNodeRef.current = peak;

      const comp = ctx.createDynamicsCompressor();
      compressorNodeRef.current = comp;

      source.connect(hpf);
      hpf.connect(peak);
      peak.connect(comp);
      comp.connect(ctx.destination);

      applyDspFilterParams(isVoiceClarityEnabled);
    } catch (err) {
      console.warn('[AudioPlayer] Web Audio DSP initialization fallback to standard HTML5 audio:', err);
    }
  }, [applyDspFilterParams, isVoiceClarityEnabled]);

  const toggleVoiceClarity = () => {
    const nextVal = !isVoiceClarityEnabled;
    setIsVoiceClarityEnabled(nextVal);
    try {
      localStorage.setItem('safora_voice_clarity', String(nextVal));
    } catch {}
    applyDspFilterParams(nextVal);
  };

  // Hover preview timestamp
  const [hoverTime, setHoverTime] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef(false);

  const formatSeconds = (sec: number): string => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getAudioDuration = useCallback((): number => {
    const audio = audioRef.current;
    if (audio && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
      return audio.duration;
    }
    return 30; // fallback standard SOS recording length
  }, []);

  // Reset state when audioUrl changes
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

  // Audio lifecycle event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      // Do not overwrite progress while dispatcher is dragging the scrubber
      if (isSeekingRef.current) return;

      const dur = getAudioDuration();
      if (dur > 0) {
        const pct = Math.min(100, Math.max(0, (audio.currentTime / dur) * 100));
        setProgress(pct);
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
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('canplay', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [getAudioDuration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    initWebAudioDsp();
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

  const skipTime = useCallback((deltaSec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = getAudioDuration();
    const target = Math.max(0, Math.min(dur, audio.currentTime + deltaSec));
    audio.currentTime = target;
    setProgress((target / dur) * 100);
    setCurrentTime(formatSeconds(target));
  }, [getAudioDuration]);

  /**
   * High-precision Seek Scrub Bar Handler:
   * Supports instant click-to-seek, smooth dragging, and global window release
   * so dragging never freezes or leaves isSeekingRef locked.
   */
  const calculatePercentageFromClientX = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(100, pos * 100));
  }, []);

  const seekToPercentage = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = getAudioDuration();
    const targetTime = (pct / 100) * dur;
    audio.currentTime = targetTime;
    setProgress(pct);
    setCurrentTime(formatSeconds(targetTime));
  }, [getAudioDuration]);

  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isSeekingRef.current = true;
    const initialPct = calculatePercentageFromClientX(e.clientX);
    seekToPercentage(initialPct);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const pct = calculatePercentageFromClientX(moveEvent.clientX);
      seekToPercentage(pct);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      const finalPct = calculatePercentageFromClientX(upEvent.clientX);
      seekToPercentage(finalPct);
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 50);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTrackTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    isSeekingRef.current = true;
    const initialPct = calculatePercentageFromClientX(e.touches[0].clientX);
    seekToPercentage(initialPct);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      const pct = calculatePercentageFromClientX(moveEvent.touches[0].clientX);
      seekToPercentage(pct);
    };

    const onTouchEnd = (endEvent: TouchEvent) => {
      const touch = endEvent.changedTouches[0];
      if (touch) {
        const finalPct = calculatePercentageFromClientX(touch.clientX);
        seekToPercentage(finalPct);
      }
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 50);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pct = calculatePercentageFromClientX(e.clientX);
    const dur = getAudioDuration();
    setHoverPosition(pct);
    setHoverTime(formatSeconds((pct / 100) * dur));
  };

  const handleTrackMouseLeave = () => {
    setHoverTime(null);
    setHoverPosition(null);
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
    if (!newMuted && volume === 0) {
      setVolume(0.5);
      audioRef.current.volume = 0.5;
    }
  };

  if (!audioUrl) {
    return (
      <div className="p-3.5 rounded-xl bg-obsidian-800/50 border border-white/5 text-xs text-gray-400 flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-gray-500" />
        <span>No audio evidence attached to this emergency signal.</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-obsidian-800/80 border border-white/10 space-y-3.5 shadow-xl">
      {/* Header with Title & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-xs font-semibold text-gray-200 tracking-wide">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleVoiceClarity}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all border ${
              isVoiceClarityEnabled
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-950/50'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
            }`}
            title="Voice Clarity Filter: High-pass (175Hz) cuts pocket friction/wind noise, Peaking (2.4kHz) clarifies speech"
          >
            <Sparkles className={`w-3 h-3 ${isVoiceClarityEnabled ? 'text-emerald-400' : 'text-gray-400'}`} />
            <span>Clarity: {isVoiceClarityEnabled ? 'ON' : 'OFF'}</span>
          </button>
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
        <div className="space-y-2.5">
          {/* Main Controls Row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all active:scale-95 flex-shrink-0"
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
              className="p-1.5 rounded-lg bg-obsidian-900 hover:bg-obsidian-700 text-gray-300 hover:text-white transition-colors flex items-center gap-0.5 text-[11px] font-mono border border-white/10"
              title="Rewind 5 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>-5s</span>
            </button>

            {/* Jump +5s */}
            <button
              onClick={() => skipTime(5)}
              className="p-1.5 rounded-lg bg-obsidian-900 hover:bg-obsidian-700 text-gray-300 hover:text-white transition-colors flex items-center gap-0.5 text-[11px] font-mono border border-white/10"
              title="Forward 5 seconds"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>+5s</span>
            </button>

            {/* Redesigned High-Precision Audio Scroll / Seek Bar */}
            <div className="flex-1 space-y-1">
              <div
                ref={trackRef}
                onMouseDown={handleTrackMouseDown}
                onTouchStart={handleTrackTouchStart}
                onMouseMove={handleTrackMouseMove}
                onMouseLeave={handleTrackMouseLeave}
                className="relative py-2.5 cursor-pointer group select-none"
                title="Click or drag to seek anywhere in the audio recording"
              >
                {/* Hover Tooltip Timestamp */}
                {hoverTime && hoverPosition !== null && (
                  <div
                    className="absolute -top-6 px-1.5 py-0.5 rounded bg-black/95 border border-white/20 text-[10px] font-mono font-semibold text-gray-200 pointer-events-none transform -translate-x-1/2 shadow-lg"
                    style={{ left: `${hoverPosition}%` }}
                  >
                    {hoverTime}
                  </div>
                )}

                {/* Scrubber Track Bar */}
                <div className="w-full h-2 group-hover:h-2.5 rounded-full bg-obsidian-950 border border-white/10 overflow-hidden transition-all shadow-inner relative">
                  {/* Played Fill Gradient */}
                  <div
                    className="h-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500 rounded-full transition-[width] duration-75"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Glowing Thumb / Playhead Indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] opacity-90 group-hover:opacity-100 group-hover:scale-125 transition-transform pointer-events-none"
                  style={{ left: `${progress}%` }}
                />
              </div>

              {/* Time Display */}
              <div className="flex justify-between text-[11px] font-mono text-gray-400">
                <span className="text-gray-200 font-semibold">{currentTime}</span>
                <span>{duration}</span>
              </div>
            </div>

            {/* Volume Control matching audio track styling */}
            {(() => {
              const effectiveVol = isMuted ? 0 : volume;
              const volumePct = Math.round(effectiveVol * 100);
              return (
                <div className="flex items-center gap-2 pl-3 border-l border-white/10 select-none">
                  <button
                    onClick={toggleMute}
                    className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-white/5"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-gray-300" />
                    )}
                  </button>

                  {/* Volume Slider Track (matching audio track gradient & glowing thumb) */}
                  <div
                    className="relative flex items-center w-20 sm:w-24 h-6 group/vol cursor-pointer"
                    title={`Sound Level: ${volumePct}%`}
                  >
                    {/* Track Background */}
                    <div className="w-full h-2 group-hover/vol:h-2.5 rounded-full bg-obsidian-950 border border-white/10 overflow-hidden transition-all shadow-inner relative">
                      {/* Gradient Fill Bar */}
                      <div
                        className="h-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500 rounded-full transition-[width] duration-75"
                        style={{ width: `${volumePct}%` }}
                      />
                    </div>

                    {/* Glowing Thumb Indicator */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] opacity-95 group-hover/vol:scale-125 transition-transform pointer-events-none"
                      style={{ left: `${volumePct}%` }}
                    />

                    {/* Native invisible range input for responsive click & drag seeking */}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={effectiveVol}
                      onChange={handleVolumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      aria-label="Sound volume level"
                    />
                  </div>

                  {/* Exact Sound Level Percentage Readout */}
                  <span
                    className={`text-[11px] font-mono font-semibold tabular-nums w-8 text-right ${
                      isMuted || volumePct === 0 ? 'text-red-400/90' : 'text-gray-300'
                    }`}
                    title={`Sound Level: ${volumePct}%`}
                  >
                    {volumePct}%
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
