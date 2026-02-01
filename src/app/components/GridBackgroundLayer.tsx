import { useEffect, useRef } from 'react';
import { drawGrid, GridConfig } from '@/utils/gridRenderer';

interface GridBackgroundLayerProps {
  enabled: boolean;
  config: GridConfig;
  videoSource?: HTMLVideoElement | MediaStream | null; // For aspect ratio matching
}

export function GridBackgroundLayer({ enabled, config, videoSource }: GridBackgroundLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (
      !enabled ||
      !config.enabled ||
      (config.opacity <= 0 && config.backgroundOpacity <= 0)
    ) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false,
    });
    if (!ctx) return;

    const resize = () => {
      if (!canvas) return;
      
      const viewportHeight = document.documentElement.clientHeight;
      const viewportWidth = document.documentElement.clientWidth;
      
      let canvasWidth: number;
      let canvasHeight: number;
      let shouldCenter = false;
      
      // Match video aspect ratio (same logic as ShaderLayer)
      if (videoSource && videoSource instanceof HTMLVideoElement) {
        const videoWidth = videoSource.videoWidth || 0;
        const videoHeight = videoSource.videoHeight || 0;
        
        if (videoWidth > 0 && videoHeight > 0) {
          const videoAspect = videoWidth / videoHeight;
          canvasHeight = viewportHeight;
          canvasWidth = canvasHeight * videoAspect;
          shouldCenter = true;
        } else {
          canvasWidth = viewportWidth;
          canvasHeight = viewportHeight;
        }
      } else {
        // Webcam or no video: full viewport
        canvasWidth = viewportWidth;
        canvasHeight = viewportHeight;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      
      // Update positioning
      if (shouldCenter) {
        canvas.style.left = '50%';
        canvas.style.transform = 'translateX(-50%)';
      } else {
        canvas.style.left = '0';
        canvas.style.transform = 'none';
      }
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Listen for video metadata loading to update size when video dimensions become available
    let handleLoadedMetadata: (() => void) | null = null;
    if (videoSource && videoSource instanceof HTMLVideoElement) {
      handleLoadedMetadata = () => {
        resize();
      };
      videoSource.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Skip rendering if canvas dimensions are invalid
      if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Optional background fill
      if (config.backgroundOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = config.backgroundOpacity;
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // Draw grid lines
      drawGrid(ctx, width, height, config);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resize);
      if (handleLoadedMetadata && videoSource && videoSource instanceof HTMLVideoElement) {
        videoSource.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [enabled, config, videoSource]);

  // Handle video source changes and trigger resize
  useEffect(() => {
    if (!enabled || !config.enabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
      const viewportHeight = document.documentElement.clientHeight;
      const viewportWidth = document.documentElement.clientWidth;
      
      let canvasWidth: number;
      let canvasHeight: number;
      let shouldCenter = false;
      
      if (videoSource && videoSource instanceof HTMLVideoElement) {
        const videoWidth = videoSource.videoWidth || 0;
        const videoHeight = videoSource.videoHeight || 0;
        
        if (videoWidth > 0 && videoHeight > 0) {
          const videoAspect = videoWidth / videoHeight;
          canvasHeight = viewportHeight;
          canvasWidth = canvasHeight * videoAspect;
          shouldCenter = true;
        } else {
          canvasWidth = viewportWidth;
          canvasHeight = viewportHeight;
        }
      } else {
        canvasWidth = viewportWidth;
        canvasHeight = viewportHeight;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      
      if (shouldCenter) {
        canvas.style.left = '50%';
        canvas.style.transform = 'translateX(-50%)';
      } else {
        canvas.style.left = '0';
        canvas.style.transform = 'none';
      }
    };
    
    // Small delay to ensure video element is ready
    const timeoutId = setTimeout(() => {
      resize();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [videoSource, enabled, config.enabled]);

  if (
    !enabled ||
    !config.enabled ||
    (config.opacity <= 0 && config.backgroundOpacity <= 0)
  ) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="grid-background-layer fixed top-0 pointer-events-none"
      style={{
        // Always render grid at zIndex 2 (between shader background at 1 and body/other effects above)
        zIndex: 2,
        // Force normal blending so the grid is a pure geometric overlay and never visually sits above the body
        mixBlendMode: 'normal',
        // Positioning handled by resize function
      }}
    />
  );
}
