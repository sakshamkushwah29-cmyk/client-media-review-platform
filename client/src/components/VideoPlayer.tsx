import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  Repeat,
  Settings,
  MapPin,
  ChevronDown,
} from 'lucide-react';

export interface VideoPlayerRef {
  getCurrentTime: () => number;
  seekTo: (timeSeconds: number) => void;
  pause: () => void;
  play: () => void;
}

export interface Marker {
  id: string;
  time: number;
  authorName?: string;
  label?: string;
  isResolved?: boolean;
}

interface VideoPlayerProps {
  src: string;
  fallbackSrc?: string;
  poster?: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  initialTime?: number;
  markers?: Marker[];
  onMarkerClick?: (time: number) => void;
}

// Frame.io standard SMPTE timecode format: HH:MM:SS:FF (at 30 fps)
export function formatTimecode(seconds: number, fps: number = 30): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00:00';
  const totalFrames = Math.floor(seconds * fps);
  const frames = totalFrames % fps;
  const s = Math.floor(seconds) % 60;
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

// Extract initials for timeline avatar markers (like "RD", "SA" in Frame.io)
function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Deterministic marker background color based on name
function getAvatarColor(name?: string): string {
  const colors = [
    'bg-amber-600',
    'bg-indigo-600',
    'bg-rose-600',
    'bg-emerald-600',
    'bg-sky-600',
    'bg-purple-600',
    'bg-orange-600',
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  src,
  fallbackSrc,
  poster,
  onTimeUpdate,
  onDurationChange,
  initialTime = 0,
  markers = [],
  onMarkerClick,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Playback src & fallback management
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [hasTriedFallback, setHasTriedFallback] = useState<boolean>(false);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    setCurrentSrc(src);
    setHasTriedFallback(false);
    setError(null);
  }, [src]);

  // Configure HLS.js or native playback whenever currentSrc changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSrc) return;

    const isHls = currentSrc.includes('.m3u8') || currentSrc.includes('/playback/');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(currentSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setError(null);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS network error, recovering...', data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS media error, recovering...', data);
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error, destroying instance...', data);
              hls.destroy();
              handleError();
              break;
          }
        }
      });
    } else {
      // Native HLS (Safari) or standard MP4 video
      video.src = currentSrc;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSrc]);

  // Authoritative playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  // Scrubbing & seeking state flags
  const isSeekingRef = useRef<boolean>(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null);

  // Expose imperative API
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      return videoRef.current ? videoRef.current.currentTime : 0;
    },
    seekTo: (timeSeconds: number) => {
      performSeek(timeSeconds);
    },
    pause: () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    },
    play: () => {
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    },
  }));

  // Authoritative Seek
  const performSeek = useCallback((targetTime: number) => {
    const video = videoRef.current;
    if (!video) return;

    const mediaDuration = video.duration || duration || 0;
    const clampedTime = Math.max(0, Math.min(mediaDuration, targetTime));

    isSeekingRef.current = true;
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    setPreviewTime(null);

    if (onTimeUpdate) {
      onTimeUpdate(clampedTime);
    }
  }, [duration, onTimeUpdate]);

  // Rewind: -5s
  const handleRewind = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    performSeek(video.currentTime - 5);
  }, [performSeek]);

  // Fast-forward: +5s
  const handleFastForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    performSeek(video.currentTime + 5);
  }, [performSeek]);

  // Play / Pause Toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().catch((err) => console.warn('Playback error:', err));
    } else {
      video.pause();
    }
  }, []);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration;
    setDuration(dur);
    setIsLoading(false);
    setError(null);
    if (onDurationChange) onDurationChange(dur);

    if (initialTime > 0) {
      video.currentTime = Math.min(dur, initialTime);
    }
  };

  const handleTimeUpdate = () => {
    if (isSeekingRef.current || isDragging) return;
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    if (onTimeUpdate) onTimeUpdate(video.currentTime);

    if (video.buffered.length > 0) {
      setBufferedEnd(video.buffered.end(video.buffered.length - 1));
    }
  };

  const handleSeeking = () => {
    isSeekingRef.current = true;
  };

  const handleSeeked = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) onTimeUpdate(video.currentTime);
    }
    isSeekingRef.current = false;
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => {
    setIsPlaying(false);
    // When paused at left, center, or right, immediately sync authoritative time to parent
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };
  const handleWaiting = () => setIsLoading(true);
  const handleCanPlay = () => setIsLoading(false);
  const handleError = () => {
    setIsLoading(false);
    if (fallbackSrc && !hasTriedFallback && currentSrc !== fallbackSrc) {
      console.warn(`Video playback failed for "${currentSrc}", attempting fallback: "${fallbackSrc}"`);
      setHasTriedFallback(true);
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
      setError(null);
      return;
    }
    setError('Unable to stream media file.');
  };

  // Timeline scrub calculation
  const calculateTimelineTime = (e: React.MouseEvent<HTMLDivElement> | MouseEvent | TouchEvent): number => {
    if (!timelineRef.current || duration <= 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percentage = offsetX / rect.width;
    return percentage * duration;
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    setIsDragging(true);
    const target = calculateTimelineTime(e);
    setPreviewTime(target);
    performSeek(target);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const moveTarget = calculateTimelineTime(moveEvent);
      setPreviewTime(moveTarget);
      performSeek(moveTarget);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false);
      const finalTarget = calculateTimelineTime(upEvent);
      performSeek(finalTarget);
      setPreviewTime(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleRewind();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleFastForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleRewind, handleFastForward]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (videoRef.current) {
      videoRef.current.loop = next;
    }
  };

  const activeDisplayTime = previewTime !== null ? previewTime : currentTime;
  const progressPercent = duration > 0 ? (activeDisplayTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[540px] lg:min-h-[640px] flex flex-col bg-[#0b0d14] rounded-2xl overflow-hidden border border-[#1e2235] shadow-2xl group select-none"
      tabIndex={0}
    >
      {/* Video Media Area - Maximized Size */}
      <div
        className="relative flex-1 w-full flex items-center justify-center bg-black cursor-pointer overflow-hidden"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          poster={poster}
          className="w-full h-full max-h-[78vh] object-contain"
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onSeeked={handleSeeked}
          onPlay={handlePlay}
          onPause={handlePause}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onError={handleError}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-slate-200 p-6 text-center z-30 pointer-events-auto">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
            <p className="font-semibold text-white mb-1">{error}</p>
            <p className="text-xs text-slate-400 mb-4 max-w-md">
              The media cut stream could not be loaded directly. You can retry loading or load the sample preview stream.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                  setIsLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
              >
                Retry Playback
              </button>
              {fallbackSrc && currentSrc !== fallbackSrc && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setError(null);
                    setHasTriedFallback(true);
                    setCurrentSrc(fallbackSrc);
                    setIsLoading(true);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer border border-slate-700 transition-all"
                >
                  Load Sample Preview
                </button>
              )}
            </div>
          </div>
        )}

        {/* Big Center Play Button Overlay when paused */}
        {!isPlaying && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-all pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/40 transform group-hover:scale-110 transition-transform">
              <Play className="w-9 h-9 fill-current translate-x-1" />
            </div>
          </div>
        )}
      </div>

      {/* Frame.io Style Scrubber Timeline with Comment Markers */}
      <div className="relative w-full bg-[#11131c] px-4 pt-3 pb-2 border-t border-[#1b1f2e]">
        {/* Scrubber Track Bar */}
        <div
          ref={timelineRef}
          className="relative w-full h-5 flex items-center cursor-pointer group/timeline"
          onMouseDown={handleTimelineMouseDown}
        >
          {/* Base Track */}
          <div className="w-full h-1 bg-[#25293d] rounded-full overflow-visible relative group-hover/timeline:h-1.5 transition-all">
            {/* Buffered Track */}
            <div
              className="absolute left-0 top-0 h-full bg-[#363c59] rounded-full pointer-events-none"
              style={{ width: `${Math.min(100, bufferPercent)}%` }}
            />
            {/* Playhead Progress Track (Frame.io blue/purple) */}
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full pointer-events-none"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>

          {/* Timeline Comment Markers (Like Frame.io avatars on timeline) */}
          {duration > 0 && markers.map((m) => {
            const markerPos = (m.time / duration) * 100;
            const initials = getInitials(m.authorName);
            const bgColor = getAvatarColor(m.authorName);

            return (
              <div
                key={m.id}
                style={{ left: `${Math.min(99, Math.max(0.5, markerPos))}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/marker cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  performSeek(m.time);
                  if (onMarkerClick) onMarkerClick(m.time);
                }}
                onMouseEnter={() => setHoveredMarker(m)}
                onMouseLeave={() => setHoveredMarker(null)}
              >
                {/* Marker circle with Author Initials */}
                <div
                  className={`w-4 h-4 rounded-full ${m.isResolved ? 'bg-emerald-600' : bgColor} ring-2 ring-[#0e1017] text-[9px] font-bold text-white flex items-center justify-center shadow-md transform hover:scale-130 transition-transform`}
                >
                  {initials}
                </div>

                {/* Marker Tooltip on Hover */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover/marker:flex flex-col items-center pointer-events-none z-30">
                  <div className="bg-[#1c2030] text-slate-100 text-[11px] px-2.5 py-1 rounded-md shadow-xl border border-[#2e344d] whitespace-nowrap">
                    <span className="text-amber-400 font-mono font-bold mr-1.5">{formatTimecode(m.time)}</span>
                    <span className="font-semibold text-white">{m.authorName || 'User'}: </span>
                    <span className="text-slate-300">{m.label || 'Feedback'}</span>
                  </div>
                  <div className="w-2 h-2 bg-[#1c2030] border-r border-b border-[#2e344d] transform rotate-45 -mt-1" />
                </div>
              </div>
            );
          })}

          {/* Current Playhead Scrubber Thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white ring-2 ring-indigo-500 shadow-lg pointer-events-none transition-transform ${
              isDragging ? 'scale-125' : 'group-hover/timeline:scale-110'
            }`}
            style={{ left: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        {/* Frame.io Controls Bar (Bottom strip) */}
        <div className="flex items-center justify-between pt-2 pb-1 text-slate-400 text-xs">
          {/* Left Controls: Play, Rewind, Fast Forward, Loop, Speed, Volume */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-[#1f2438] text-slate-200 hover:text-white transition-colors cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
            </button>

            <button
              onClick={handleRewind}
              className="p-1 rounded hover:bg-[#1f2438] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Rewind 5s (Left Arrow)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleFastForward}
              className="p-1 rounded hover:bg-[#1f2438] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Forward 5s (Right Arrow)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Loop Toggle */}
            <button
              onClick={toggleLoop}
              className={`p-1 rounded transition-colors cursor-pointer ${isLooping ? 'text-indigo-400 bg-indigo-950/60' : 'hover:bg-[#1f2438] text-slate-400 hover:text-slate-200'}`}
              title="Toggle Loop"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            {/* Playback Speed Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-0.5 rounded text-[11px] font-mono hover:bg-[#1f2438] text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <span>{playbackRate}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 left-0 bg-[#191d2c] border border-[#2b3147] rounded-lg shadow-xl p-1 z-30 flex flex-col gap-0.5">
                  {[0.5, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-3 py-1 text-[11px] font-mono text-left rounded hover:bg-indigo-600 hover:text-white ${
                        playbackRate === s ? 'text-indigo-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1 rounded hover:bg-[#1f2438] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-[#25293d] rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Center: Frame.io High Precision SMPTE Timecode Counter */}
          <div className="flex items-center gap-1.5 bg-[#171a26] border border-[#23283b] px-3 py-1 rounded-lg">
            <span className="font-mono text-xs font-semibold text-slate-200 tracking-wider">
              {formatTimecode(activeDisplayTime)}
            </span>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-[11px] text-slate-500">
              {formatTimecode(duration)}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>

          {/* Right Controls: HD Badge, Settings, Fullscreen */}
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-mono text-[10px] font-bold">
              HD
            </span>
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded hover:bg-[#1f2438] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
