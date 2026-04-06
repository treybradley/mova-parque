import { useRef, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Blob, TrackingSettings, VisualSettings, SoundSettings, BlobFrame } from '@/app/mova-score/types';
import { detectBlobs } from '@/app/mova-score/utils/blobDetection';
import { drawBlobs } from '@/app/mova-score/utils/blobVisualization';
import { SoundEngine } from '@/app/mova-score/utils/soundEngine';

const RECORDING_PROGRESS_MS = 200;
const DEBUG_INFO_INTERVAL_FRAMES = 15;

export interface RecordingCaptureRefState {
  active: boolean;
  frames: BlobFrame[];
}

interface VideoCanvasProps {
  videoElement: HTMLVideoElement | null;
  isPlaying: boolean;
  trackingSettings: TrackingSettings;
  visualSettings: VisualSettings;
  soundSettings: SoundSettings;
  onBlobsDetected?: (blobs: Blob[]) => void;
  /** Push frames here while active; avoids React state on every frame. */
  recordingCaptureRef?: MutableRefObject<RecordingCaptureRefState | null>;
  /** Throttled (~5 Hz) frame count for UI while recording. */
  onRecordingFrameCount?: (count: number) => void;
}

export function VideoCanvas({
  videoElement,
  isPlaying,
  trackingSettings,
  visualSettings,
  soundSettings,
  onBlobsDetected,
  recordingCaptureRef,
  onRecordingFrameCount,
}: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const blobsRef = useRef<Blob[]>([]);
  const trackingSettingsRef = useRef(trackingSettings);
  const visualSettingsRef = useRef(visualSettings);
  const soundSettingsRef = useRef(soundSettings);
  const onBlobsDetectedRef = useRef(onBlobsDetected);
  const audioContextStartedRef = useRef(false);
  const recordingProgressLastEmitRef = useRef(0);
  const onRecordingFrameCountRef = useRef(onRecordingFrameCount);
  const debugFrameCounterRef = useRef(0);

  const soundEngineRef = useRef<SoundEngine | null>(null);
  const [audioContextStarted, setAudioContextStarted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    activeVoices: number;
    maxVoices: number;
    contextState: string;
    isStarted: boolean;
    pendingCleanups: number;
  } | null>(null);

  useEffect(() => {
    trackingSettingsRef.current = trackingSettings;
  }, [trackingSettings]);

  useEffect(() => {
    visualSettingsRef.current = visualSettings;
  }, [visualSettings]);

  useEffect(() => {
    soundSettingsRef.current = soundSettings;
  }, [soundSettings]);

  useEffect(() => {
    onBlobsDetectedRef.current = onBlobsDetected;
  }, [onBlobsDetected]);

  useEffect(() => {
    audioContextStartedRef.current = audioContextStarted;
  }, [audioContextStarted]);

  useEffect(() => {
    onRecordingFrameCountRef.current = onRecordingFrameCount;
  }, [onRecordingFrameCount]);

  const handleStartAudio = async () => {
    if (soundEngineRef.current && !audioContextStarted) {
      await soundEngineRef.current.start();
      setAudioContextStarted(true);
    }
  };

  useEffect(() => {
    soundEngineRef.current = new SoundEngine(soundSettings);

    return () => {
      if (soundEngineRef.current) {
        soundEngineRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (soundEngineRef.current) {
      soundEngineRef.current.updateSettings(soundSettings);
    }
  }, [soundSettings]);

  useEffect(() => {
    if (soundEngineRef.current && canvasRef.current) {
      soundEngineRef.current.setVideoSize(
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  }, [canvasRef.current?.width, canvasRef.current?.height]);

  useEffect(() => {
    if (!canvasRef.current || !videoElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const updateCanvasSize = () => {
      if (videoElement.videoWidth && videoElement.videoHeight) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        if (soundEngineRef.current) {
          soundEngineRef.current.setVideoSize(canvas.width, canvas.height);
        }
      }
    };

    videoElement.addEventListener('loadedmetadata', updateCanvasSize);
    updateCanvasSize();

    return () => {
      videoElement.removeEventListener('loadedmetadata', updateCanvasSize);
    };
  }, [videoElement]);

  useEffect(() => {
    if (!canvasRef.current || !videoElement || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (soundEngineRef.current) {
        soundEngineRef.current.stopAll();
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const processFrame = () => {
      if (!videoElement || videoElement.paused || videoElement.ended) return;

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const detectedBlobs = detectBlobs(imageData, trackingSettingsRef.current);
      blobsRef.current = detectedBlobs;

      onBlobsDetectedRef.current?.(detectedBlobs);

      const engine = soundEngineRef.current;
      const snd = soundSettingsRef.current;
      if (engine) {
        if (!snd.enabled || !audioContextStartedRef.current) {
          engine.stopAll();
        } else {
          engine.updateBlobs(detectedBlobs);
        }

        if (snd.enabled && audioContextStartedRef.current) {
          debugFrameCounterRef.current += 1;
          if (debugFrameCounterRef.current >= DEBUG_INFO_INTERVAL_FRAMES) {
            debugFrameCounterRef.current = 0;
            setDebugInfo(engine.getDebugInfo());
          }
        }
      }

      drawBlobs(ctx, detectedBlobs, visualSettingsRef.current);

      const cap = recordingCaptureRef?.current;
      if (cap?.active) {
        cap.frames.push({
          timestamp: videoElement.currentTime,
          blobs: detectedBlobs.map((b) => ({ ...b })),
        });
        const emit = onRecordingFrameCountRef.current;
        if (emit) {
          const len = cap.frames.length;
          const now = performance.now();
          if (
            len === 1 ||
            now - recordingProgressLastEmitRef.current >= RECORDING_PROGRESS_MS
          ) {
            recordingProgressLastEmitRef.current = now;
            emit(len);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoElement, isPlaying, recordingCaptureRef]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
      />

      {soundSettings.enabled && !audioContextStarted && (
        <button
          onClick={handleStartAudio}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/20 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-white/30 transition-colors backdrop-blur-md border border-white/10"
        >
          Click to Enable Audio
        </button>
      )}

      {debugInfo && soundSettings.enabled && audioContextStarted && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-xs space-y-1 font-mono backdrop-blur-md border border-white/10">
          <div className="flex gap-2">
            <span className="text-white/60">Voices:</span>
            <span className={debugInfo.activeVoices > debugInfo.maxVoices * 0.8 ? 'text-yellow-400' : 'text-green-400'}>
              {debugInfo.activeVoices}/{debugInfo.maxVoices}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-white/60">Cleanup:</span>
            <span>{debugInfo.pendingCleanups}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-white/60">Context:</span>
            <span className={debugInfo.contextState === 'running' ? 'text-green-400' : 'text-red-400'}>
              {debugInfo.contextState}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
