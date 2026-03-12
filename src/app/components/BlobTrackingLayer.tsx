import { useRef, useEffect } from 'react';
import { BlobTrackingConfig, detectBlobsFromMask, smoothBlobs, Blob } from '@/utils/blobTracking';

interface BlobTrackingLayerProps {
  config: BlobTrackingConfig;
  videoSource: HTMLVideoElement | MediaStream | null; // Required video source for blob detection
  sharedWebcamVideoRef?: React.RefObject<HTMLVideoElement | null>; // For webcam: shared video element
}

export function BlobTrackingLayer({ config, videoSource, sharedWebcamVideoRef }: BlobTrackingLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null); // Hidden canvas for video frame capture
  const videoRef = useRef<HTMLVideoElement | null>(null); // Video element for MediaStream (fallback if no shared)
  const animationFrameRef = useRef<number | undefined>(undefined);
  const frameCounterRef = useRef<number>(0);
  const previousBlobsRef = useRef<Blob[]>([]);
  const currentBlobsRef = useRef<Blob[]>([]);
  const interpolationProgressRef = useRef<number>(0);

  // Setup video element for MediaStream (only if shared video not provided)
  useEffect(() => {
    if (!videoSource || videoSource instanceof HTMLVideoElement) {
      // No setup needed for HTMLVideoElement or null
      return;
    }

    // Use shared video element if provided, otherwise create own
    if (sharedWebcamVideoRef?.current) {
      // Shared video element exists, no need to create own
      return;
    }

    // Create video element for MediaStream (fallback)
    const video = document.createElement('video');
    video.srcObject = videoSource;
    video.playsInline = true;
    video.muted = true;
    video.play().catch(err => console.error('BlobTrackingLayer video play error:', err));
    videoRef.current = video;

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
    };
  }, [videoSource, sharedWebcamVideoRef]);

  useEffect(() => {
    if (!config.enabled || !videoSource) {
      // Clear canvas when disabled
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      // Reset refs
      frameCounterRef.current = 0;
      previousBlobsRef.current = [];
      currentBlobsRef.current = [];
      interpolationProgressRef.current = 0;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Create hidden canvas for video frame capture if it doesn't exist
    if (!videoCanvasRef.current) {
      const videoCanvas = document.createElement('canvas');
      videoCanvasRef.current = videoCanvas;
    }
    const videoCanvas = videoCanvasRef.current;
    const videoCtx = videoCanvas.getContext('2d');
    if (!videoCtx) return;

    // Set canvas size based on video aspect ratio (only for uploaded videos, webcam stays full viewport)
    const resizeCanvas = () => {
      if (!canvas) return;
      
      const viewportHeight = document.documentElement.clientHeight;
      const viewportWidth = document.documentElement.clientWidth;
      
      let canvasWidth: number;
      let canvasHeight: number;
      let shouldCenter = false;
      
      // Only apply aspect ratio cropping for uploaded videos (HTMLVideoElement)
      // Webcam (MediaStream) should remain full viewport
      if (videoSource && videoSource instanceof HTMLVideoElement) {
        const videoWidth = videoSource.videoWidth || 0;
        const videoHeight = videoSource.videoHeight || 0;
        
        if (videoWidth > 0 && videoHeight > 0) {
          // Calculate canvas dimensions: full viewport height, width adjusted for video aspect ratio
          const videoAspect = videoWidth / videoHeight;
          canvasHeight = viewportHeight;
          canvasWidth = canvasHeight * videoAspect;
          shouldCenter = true;
        } else {
          // Video metadata not loaded yet, use full viewport
          canvasWidth = viewportWidth;
          canvasHeight = viewportHeight;
        }
      } else {
        // Webcam or no video source: use full viewport
        canvasWidth = viewportWidth;
        canvasHeight = viewportHeight;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      
      // Update canvas positioning based on whether we're centering
      if (shouldCenter) {
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '50%';
        canvas.style.transform = 'translateX(-50%)';
      } else {
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.transform = 'none';
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Also listen for video metadata loading to update size when video dimensions become available
    let handleLoadedMetadata: (() => void) | null = null;
    if (videoSource && videoSource instanceof HTMLVideoElement) {
      handleLoadedMetadata = () => {
        resizeCanvas();
      };
      videoSource.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    // Animation loop
    const render = () => {
      // Determine active video element
      const activeVideoElement = videoSource instanceof HTMLVideoElement
        ? videoSource
        : (sharedWebcamVideoRef?.current || videoRef.current);

      if (!activeVideoElement || activeVideoElement.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Set video canvas dimensions to match video
      const videoWidth = activeVideoElement.videoWidth || 640;
      const videoHeight = activeVideoElement.videoHeight || 480;
      
      if (videoCanvas.width !== videoWidth || videoCanvas.height !== videoHeight) {
        videoCanvas.width = videoWidth;
        videoCanvas.height = videoHeight;
      }

      // Draw current video frame to hidden canvas
      videoCtx.drawImage(activeVideoElement, 0, 0, videoWidth, videoHeight);

      // Detection interval throttling
      frameCounterRef.current++;
      if (frameCounterRef.current >= config.detectionInterval) {
        frameCounterRef.current = 0;
        
        // Only get ImageData when we actually need to detect blobs (avoid memory leaks)
        const imageData = videoCtx.getImageData(0, 0, videoWidth, videoHeight);
        
        // Detect new blobs from video frame
        const detectedBlobs = detectBlobsFromMask(
          imageData,
          config.threshold,
          config.minBlobSize,
          config.maxBlobSize,
          config.detectionMode
        );

        // Apply smoothing
        currentBlobsRef.current = smoothBlobs(
          detectedBlobs,
          previousBlobsRef.current,
          config.smoothing
        );

        // Store for next frame
        previousBlobsRef.current = currentBlobsRef.current;
      }

      // Render current blobs
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Scale to match video dimensions
      const scaleX = canvas.width / videoWidth;
      const scaleY = canvas.height / videoHeight;
      ctx.scale(scaleX, scaleY);

      // Render blobs manually using stored blob data
      const blobs = currentBlobsRef.current;
      
      if (config.showBoundingBoxes && blobs.length > 0) {
        ctx.strokeStyle = config.boundingBoxColor;
        ctx.lineWidth = config.boundingBoxLineWidth;

        blobs.forEach((blob) => {
          const width = blob.maxX - blob.minX;
          const height = blob.maxY - blob.minY;
          const centerX = blob.cx;
          const centerY = blob.cy;

          const scaledWidth = width * config.boundingBoxSize;
          const scaledHeight = height * config.boundingBoxSize;
          const x = centerX - scaledWidth / 2;
          const y = centerY - scaledHeight / 2;

          if (config.boundingBoxShape === 'square') {
            switch (config.boundingBoxRegionStyle) {
              case 'frame':
                ctx.strokeRect(x, y, scaledWidth, scaledHeight);
                break;
              case 'l-frame': {
                const cornerLen = Math.min(scaledWidth, scaledHeight) * 0.2;
                // Top-left
                ctx.beginPath();
                ctx.moveTo(x, y + cornerLen);
                ctx.lineTo(x, y);
                ctx.lineTo(x + cornerLen, y);
                ctx.stroke();
                // Top-right
                ctx.beginPath();
                ctx.moveTo(x + scaledWidth - cornerLen, y);
                ctx.lineTo(x + scaledWidth, y);
                ctx.lineTo(x + scaledWidth, y + cornerLen);
                ctx.stroke();
                // Bottom-left
                ctx.beginPath();
                ctx.moveTo(x, y + scaledHeight - cornerLen);
                ctx.lineTo(x, y + scaledHeight);
                ctx.lineTo(x + cornerLen, y + scaledHeight);
                ctx.stroke();
                // Bottom-right
                ctx.beginPath();
                ctx.moveTo(x + scaledWidth - cornerLen, y + scaledHeight);
                ctx.lineTo(x + scaledWidth, y + scaledHeight);
                ctx.lineTo(x + scaledWidth, y + scaledHeight - cornerLen);
                ctx.stroke();
                break;
              }
              case 'x-frame':
                ctx.strokeRect(x, y, scaledWidth, scaledHeight);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + scaledWidth, y + scaledHeight);
                ctx.moveTo(x + scaledWidth, y);
                ctx.lineTo(x, y + scaledHeight);
                ctx.stroke();
                break;
              case 'grid':
                ctx.strokeRect(x, y, scaledWidth, scaledHeight);
                ctx.beginPath();
                ctx.moveTo(x + scaledWidth / 3, y);
                ctx.lineTo(x + scaledWidth / 3, y + scaledHeight);
                ctx.moveTo(x + (2 * scaledWidth) / 3, y);
                ctx.lineTo(x + (2 * scaledWidth) / 3, y + scaledHeight);
                ctx.moveTo(x, y + scaledHeight / 3);
                ctx.lineTo(x + scaledWidth, y + scaledHeight / 3);
                ctx.moveTo(x, y + (2 * scaledHeight) / 3);
                ctx.lineTo(x + scaledWidth, y + (2 * scaledHeight) / 3);
                ctx.stroke();
                break;
              case 'scope':
                ctx.strokeRect(x, y, scaledWidth, scaledHeight);
                ctx.beginPath();
                ctx.moveTo(centerX, y);
                ctx.lineTo(centerX, y + scaledHeight);
                ctx.moveTo(x, centerY);
                ctx.lineTo(x + scaledWidth, centerY);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(centerX, centerY, Math.min(scaledWidth, scaledHeight) * 0.1, 0, Math.PI * 2);
                ctx.stroke();
                break;
              default:
                ctx.strokeRect(x, y, scaledWidth, scaledHeight);
            }
          } else if (config.boundingBoxShape === 'circle') {
            const radius = Math.max(scaledWidth, scaledHeight) / 2;
            switch (config.boundingBoxRegionStyle) {
              case 'frame':
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
                break;
              case 'l-frame': {
                // Four arc segments (corner brackets) with gaps
                const gap = 0.35;
                const arcLen = Math.PI / 2 - gap;
                for (let i = 0; i < 4; i++) {
                  const start = i * (Math.PI / 2) + gap / 2;
                  const end = start + arcLen;
                  ctx.beginPath();
                  ctx.arc(centerX, centerY, radius, start, end);
                  ctx.stroke();
                }
                break;
              }
              case 'x-frame':
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(centerX - radius, centerY - radius);
                ctx.lineTo(centerX + radius, centerY + radius);
                ctx.moveTo(centerX + radius, centerY - radius);
                ctx.lineTo(centerX - radius, centerY + radius);
                ctx.stroke();
                break;
              case 'grid':
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                  const a = (i * Math.PI) / 2;
                  ctx.moveTo(centerX, centerY);
                  ctx.lineTo(centerX + radius * Math.cos(a), centerY + radius * Math.sin(a));
                }
                for (let i = 0; i < 4; i++) {
                  const a = Math.PI / 4 + (i * Math.PI) / 2;
                  ctx.moveTo(centerX, centerY);
                  ctx.lineTo(centerX + radius * Math.cos(a), centerY + radius * Math.sin(a));
                }
                ctx.stroke();
                break;
              case 'scope':
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - radius);
                ctx.lineTo(centerX, centerY + radius);
                ctx.moveTo(centerX - radius, centerY);
                ctx.lineTo(centerX + radius, centerY);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * 0.1, 0, Math.PI * 2);
                ctx.stroke();
                break;
              default:
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
          }
        });
      }

      if (config.showCentroids && blobs.length > 0) {
        ctx.fillStyle = config.centroidColor;
        blobs.forEach((blob) => {
          ctx.beginPath();
          ctx.arc(blob.cx, blob.cy, config.centroidSize, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = config.centroidColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(blob.cx - config.centroidSize * 2, blob.cy);
          ctx.lineTo(blob.cx + config.centroidSize * 2, blob.cy);
          ctx.moveTo(blob.cx, blob.cy - config.centroidSize * 2);
          ctx.lineTo(blob.cx, blob.cy + config.centroidSize * 2);
          ctx.stroke();
        });
      }

      if (config.showConnections && blobs.length > 1) {
        ctx.strokeStyle = config.connectionColor;
        ctx.lineWidth = config.connectionLineWidth;
        if (config.connectionStyle === 'dashed') {
          ctx.setLineDash([10, 5]);
        } else {
          ctx.setLineDash([]);
        }

        for (let i = 0; i < blobs.length; i++) {
          for (let j = i + 1; j < blobs.length; j++) {
            ctx.beginPath();
            ctx.moveTo(blobs[i].cx, blobs[i].cy);
            ctx.lineTo(blobs[j].cx, blobs[j].cy);
            ctx.stroke();
          }
        }
        ctx.setLineDash([]);
      }

      if (config.showText && blobs.length > 0) {
        ctx.fillStyle = config.textColor;
        ctx.font = `${config.textFontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        blobs.forEach((blob) => {
          let text: string;
          if (config.textType === 'position') {
            text = `(${Math.round(blob.cx)}, ${Math.round(blob.cy)})`;
          } else {
            text = `${Math.round(blob.count)} px`;
          }

          const textX = blob.cx;
          const textY = blob.maxY + 10;

          ctx.fillStyle = config.textColor;
          ctx.fillText(text, textX, textY);
        });
      }

      ctx.restore();
      
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
      if (handleLoadedMetadata && videoSource && videoSource instanceof HTMLVideoElement) {
        videoSource.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [config, videoSource, sharedWebcamVideoRef]);

  if (!config.enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="blob-tracking-canvas pointer-events-none z-[10]"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}