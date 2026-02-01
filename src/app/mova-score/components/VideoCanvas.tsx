import { useRef, useEffect, useState } from 'react';
import { Blob, TrackingSettings, VisualSettings, SoundSettings, BlobFrame } from '@/app/mova-score/types';
import { detectBlobs } from '@/app/mova-score/utils/blobDetection';
import { drawBlobs } from '@/app/mova-score/utils/blobVisualization';
import { SoundEngine } from '@/app/mova-score/utils/soundEngine';

interface VideoCanvasProps {
  videoElement: HTMLVideoElement | null;
  isPlaying: boolean;
  trackingSettings: TrackingSettings;
  visualSettings: VisualSettings;
  soundSettings: SoundSettings;
  onBlobsDetected?: (blobs: Blob[]) => void;
  isRecording?: boolean;
  onBlobFrameCapture?: (frame: BlobFrame) => void;
}

export function VideoCanvas({
  videoElement,
  isPlaying,
  trackingSettings,
  visualSettings,
  soundSettings,
  onBlobsDetected,
  isRecording,
  onBlobFrameCapture
}: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const soundEngineRef = useRef<SoundEngine | null>(null);
  const [audioContextStarted, setAudioContextStarted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    activeVoices: number;
    maxVoices: number;
    contextState: string;
    isStarted: boolean;
    pendingCleanups: number;
  } | null>(null);

  // Handle audio context start (required by browsers)
  const handleStartAudio = async () => {
    if (soundEngineRef.current && !audioContextStarted) {
      await soundEngineRef.current.start();
      setAudioContextStarted(true);
    }
  };

  // Initialize sound engine
  useEffect(() => {
    soundEngineRef.current = new SoundEngine(soundSettings);
    
    return () => {
      if (soundEngineRef.current) {
        soundEngineRef.current.dispose();
      }
    };
  }, []);

  // Update sound engine settings
  useEffect(() => {
    if (soundEngineRef.current) {
      soundEngineRef.current.updateSettings(soundSettings);
    }
  }, [soundSettings]);

  // Update video size for sound engine
  useEffect(() => {
    if (soundEngineRef.current && canvasRef.current) {
      soundEngineRef.current.setVideoSize(
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  }, [canvasRef.current?.width, canvasRef.current?.height]);

  // Update blobs to sound engine
  useEffect(() => {
    if (soundEngineRef.current) {
      // If video is not playing, stop all sounds
      if (!isPlaying) {
        soundEngineRef.current.stopAll();
      } else {
        soundEngineRef.current.updateBlobs(blobs);
      }
      
      // Update debug info
      setDebugInfo(soundEngineRef.current.getDebugInfo());
    }
  }, [blobs, isPlaying]);

  useEffect(() => {
    if (!canvasRef.current || !videoElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size to match video
    const updateCanvasSize = () => {
      if (videoElement.videoWidth && videoElement.videoHeight) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
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
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const processFrame = () => {
      if (!videoElement || videoElement.paused || videoElement.ended) return;

      // Draw video frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Get image data for blob detection
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Detect blobs
      const detectedBlobs = detectBlobs(imageData, trackingSettings);
      setBlobs(detectedBlobs);
      
      if (onBlobsDetected) {
        onBlobsDetected(detectedBlobs);
      }

      // Draw blob visualizations on top
      drawBlobs(ctx, detectedBlobs, visualSettings);

      // Capture frame if recording
      if (isRecording && onBlobFrameCapture) {
        const frame: BlobFrame = {
          timestamp: videoElement.currentTime,
          blobs: detectedBlobs
        };
        onBlobFrameCapture(frame);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoElement, isPlaying, trackingSettings, visualSettings, onBlobsDetected, isRecording, onBlobFrameCapture]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
      />
      
      {/* Audio context start button */}
      {soundSettings.enabled && !audioContextStarted && (
        <button
          onClick={handleStartAudio}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/20 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-white/30 transition-colors backdrop-blur-md border border-white/10"
        >
          Click to Enable Audio
        </button>
      )}
      
      
      {/* Debug info */}
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
