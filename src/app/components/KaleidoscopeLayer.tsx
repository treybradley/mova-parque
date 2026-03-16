import { useEffect, useRef } from 'react';

interface KaleidoscopeLayerProps {
  mode: 'none' | 'horizontal' | 'vertical' | 'radial';
  blendMode: string;
  children: React.ReactNode;
  videoSource?: HTMLVideoElement | MediaStream | null; // Optional video source for aspect ratio matching
}

export function KaleidoscopeLayer({ mode, blendMode, children, videoSource }: KaleidoscopeLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (mode === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size based on video aspect ratio (only for uploaded videos, webcam stays full viewport)
    // Try to match the body effects canvas dimensions exactly for consistency
    const resize = () => {
      if (!canvas) return;
      
      const viewportHeight = document.documentElement.clientHeight;
      const viewportWidth = document.documentElement.clientWidth;
      
      let canvasWidth: number;
      let canvasHeight: number;
      let shouldCenter = false;
      
      // Try to match body effects canvas dimensions if available (it matches video aspect ratio)
      const bodyCanvas = document.querySelector('canvas.body-effects-canvas') as HTMLCanvasElement | undefined;
      if (bodyCanvas && bodyCanvas.width > 0 && bodyCanvas.height > 0) {
        // Use body canvas dimensions directly to ensure perfect match
        canvasWidth = bodyCanvas.width;
        canvasHeight = bodyCanvas.height;
        shouldCenter = !!(videoSource && videoSource instanceof HTMLVideoElement);
      } else if (videoSource && videoSource instanceof HTMLVideoElement) {
        // Fallback: calculate from video aspect ratio if body canvas not ready yet
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
    resize();
    window.addEventListener('resize', resize);
    
    // Also listen for video metadata loading to update size when video dimensions become available
    let handleLoadedMetadata: (() => void) | null = null;
    if (videoSource && videoSource instanceof HTMLVideoElement) {
      handleLoadedMetadata = () => {
        resize();
      };
      videoSource.addEventListener('loadedmetadata', handleLoadedMetadata);
    }
    
    // Watch for body canvas size changes to keep kaleidoscope canvas in sync
    // Use a MutationObserver to detect when body canvas dimensions change
    const bodyCanvasObserver = new MutationObserver(() => {
      resize();
    });
    
    // Observe the body canvas if it exists
    let bodyCanvas = document.querySelector('canvas.body-effects-canvas');
    if (bodyCanvas) {
      bodyCanvasObserver.observe(bodyCanvas, {
        attributes: true,
        attributeFilter: ['width', 'height', 'style']
      });
    }
    
    // Also check periodically for body canvas to appear (in case it's not ready yet)
    const checkBodyCanvas = setInterval(() => {
      bodyCanvas = document.querySelector('canvas.body-effects-canvas');
      if (bodyCanvas) {
        // Check if we're already observing this canvas
        const records = bodyCanvasObserver.takeRecords();
        if (records.length === 0) {
          // Not observing yet, start observing
          bodyCanvasObserver.observe(bodyCanvas, {
            attributes: true,
            attributeFilter: ['width', 'height', 'style']
          });
          resize(); // Resize immediately when body canvas appears
        }
      }
    }, 100);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      try {
        ctx.clearRect(0, 0, w, h);
        
        // Find first canvas (grid), depth layer, body effects, blob tracking, pose
        const allCanvases = document.querySelectorAll('canvas:not(.kaleidoscope-canvas):not(.film-grain-canvas)');
        const bgCanvas = allCanvases[0] as HTMLCanvasElement | undefined;
        const depthCanvas = document.querySelector('canvas.depth-layer-canvas') as HTMLCanvasElement | undefined;
        const bodyCanvas = document.querySelector('canvas.body-effects-canvas') as HTMLCanvasElement | undefined;
        const blobCanvas = document.querySelector('canvas.blob-tracking-canvas') as HTMLCanvasElement | undefined;
        const poseCanvas = document.querySelector('canvas.pose-estimation-canvas') as HTMLCanvasElement | undefined;
        const rawVideo = document.querySelector('video.raw-video-display') as HTMLVideoElement | undefined;
        
        const bgValid = bgCanvas && bgCanvas.width > 1 && bgCanvas.height > 1;
        const depthValid = depthCanvas && depthCanvas.width > 1 && depthCanvas.height > 1;
        const bodyValid = bodyCanvas && bodyCanvas.width > 1 && bodyCanvas.height > 1;
        const blobValid = blobCanvas && blobCanvas.width > 1 && blobCanvas.height > 1;
        const poseValid = poseCanvas && poseCanvas.width > 1 && poseCanvas.height > 1;
        const rawValid = rawVideo && rawVideo.videoWidth > 1 && rawVideo.videoHeight > 1;
        
        if (!bgValid && !depthValid && !bodyValid && !blobValid && !poseValid && !rawValid) {
          animationRef.current = requestAnimationFrame(render);
          return;
        }

        // Helper: draw each layer using its own dimensions for the source rect, so pose/blob
        // (which may be video resolution) align correctly with body/bg (viewport-aspect).
        type SourceRect = { x: number; y: number; w: number; h: number };
        const drawLayers = (
          getSourceRect: (layerWidth: number, layerHeight: number) => SourceRect,
          destX: number,
          destY: number,
          destW: number,
          destH: number
        ) => {
          if (bgValid && bgCanvas) {
            const r = getSourceRect(bgCanvas.width, bgCanvas.height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(bgCanvas, r.x, r.y, r.w, r.h, destX, destY, destW, destH);
          }
          // Raw video layer – treat like a background source so it is also mirrored
          if (rawValid && rawVideo) {
            const r = getSourceRect(rawVideo.videoWidth, rawVideo.videoHeight);
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(rawVideo, r.x, r.y, r.w, r.h, destX, destY, destW, destH);
          }
          if (depthValid && depthCanvas) {
            const r = getSourceRect(depthCanvas.width, depthCanvas.height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(depthCanvas, r.x, r.y, r.w, r.h, destX, destY, destW, destH);
          }
          if (bodyValid && bodyCanvas) {
            const r = getSourceRect(bodyCanvas.width, bodyCanvas.height);
            ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
            ctx.drawImage(bodyCanvas, r.x, r.y, r.w, r.h, destX, destY, destW, destH);
            ctx.globalCompositeOperation = 'source-over';
          }
          if (poseValid && poseCanvas) {
            const r = getSourceRect(poseCanvas.width, poseCanvas.height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(poseCanvas, r.x, r.y, r.w, r.h, destX, destY, destW, destH);
          }
          if (blobValid && blobCanvas) {
            const r = getSourceRect(blobCanvas.width, blobCanvas.height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(blobCanvas, r.x, r.y, r.w, r.h, destX, destY, destW, destH);
          }
        };

        if (mode === 'horizontal') {
          // Take bottom half of each layer and mirror to top
          const halfH = h / 2;
          const getBottomHalf = (lw: number, lh: number): SourceRect => ({
            x: 0,
            y: lh / 2,
            w: lw,
            h: lh / 2,
          });
          drawLayers(getBottomHalf, 0, halfH, w, halfH);
          ctx.save();
          ctx.scale(1, -1);
          ctx.translate(0, -halfH);
          drawLayers(getBottomHalf, 0, 0, w, halfH);
          ctx.restore();
        } else if (mode === 'vertical') {
          // Take left half of each layer and mirror to right
          const halfW = w / 2;
          const getLeftHalf = (lw: number, lh: number): SourceRect => ({
            x: 0,
            y: 0,
            w: lw / 2,
            h: lh,
          });
          drawLayers(getLeftHalf, 0, 0, halfW, h);
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          drawLayers(getLeftHalf, 0, 0, halfW, h);
          ctx.restore();
        } else if (mode === 'radial') {
          // 4-way mirror from top-left quadrant of each layer
          const halfW = w / 2;
          const halfH = h / 2;
          const getTopLeftQuadrant = (lw: number, lh: number): SourceRect => ({
            x: 0,
            y: 0,
            w: Math.max(1, Math.floor(lw / 2)),
            h: Math.max(1, Math.floor(lh / 2)),
          });
          drawLayers(getTopLeftQuadrant, 0, 0, halfW, halfH);
          ctx.save();
          ctx.scale(-1, 1);
          drawLayers(getTopLeftQuadrant, -w, 0, halfW, halfH);
          ctx.restore();
          ctx.save();
          ctx.scale(1, -1);
          drawLayers(getTopLeftQuadrant, 0, -h, halfW, halfH);
          ctx.restore();
          ctx.save();
          ctx.scale(-1, -1);
          drawLayers(getTopLeftQuadrant, -w, -h, halfW, halfH);
          ctx.restore();
        }
      } catch (err) {
        console.error('Kaleidoscope render error:', err);
      }

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
      bodyCanvasObserver.disconnect();
      clearInterval(checkBodyCanvas);
    };
  }, [mode, blendMode, videoSource]);

  // Always render children normally (once)
  return (
    <>
      {children}
      {mode !== 'none' && (
        <canvas
          ref={canvasRef}
          className="kaleidoscope-canvas pointer-events-none z-[15]"
        />
      )}
    </>
  );
}