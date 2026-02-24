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
        
        // Find shader background (first canvas), body effects canvas, blob tracking canvas, and pose canvas
        const allCanvases = document.querySelectorAll('canvas:not(.kaleidoscope-canvas):not(.film-grain-canvas)');
        const bgCanvas = allCanvases[0] as HTMLCanvasElement | undefined;
        const bodyCanvas = document.querySelector('canvas.body-effects-canvas') as HTMLCanvasElement | undefined;
        const blobCanvas = document.querySelector('canvas.blob-tracking-canvas') as HTMLCanvasElement | undefined;
        const poseCanvas = document.querySelector('canvas.pose-estimation-canvas') as HTMLCanvasElement | undefined;
        
        // Validate canvases
        const bgValid = bgCanvas && bgCanvas.width > 1 && bgCanvas.height > 1;
        const bodyValid = bodyCanvas && bodyCanvas.width > 1 && bodyCanvas.height > 1;
        const blobValid = blobCanvas && blobCanvas.width > 1 && blobCanvas.height > 1;
        const poseValid = poseCanvas && poseCanvas.width > 1 && poseCanvas.height > 1;
        
        if (!bgValid && !bodyValid && !blobValid && !poseValid) {
          animationRef.current = requestAnimationFrame(render);
          return;
        }
        
        // Helper function to draw all layers with proper blending
        const drawLayers = (srcX: number, srcY: number, srcW: number, srcH: number, 
                           destX: number, destY: number, destW: number, destH: number) => {
          // Draw background first
          if (bgValid && bgCanvas) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(bgCanvas, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
          }
          
          // Draw body canvas with blend mode
          if (bodyValid && bodyCanvas) {
            // Map CSS blend mode to Canvas composite operation
            ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
            ctx.drawImage(bodyCanvas, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
            ctx.globalCompositeOperation = 'source-over'; // Reset
          }
          
          // Draw pose canvas (after body, before blob)
          if (poseValid && poseCanvas) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(poseCanvas, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
          }
          
          // Draw blob tracking canvas (source-over: stack on top of previous layers)
          if (blobValid && blobCanvas) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(blobCanvas, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
          }
        };
        
        if (mode === 'horizontal') {
          // Take bottom half and mirror it to top
          const halfH = h / 2;
          
          // Use the body effects canvas dimensions as the primary source (it matches video aspect ratio)
          // Fall back to other canvases if body canvas isn't available
          let srcW = w; // Default to kaleidoscope canvas width
          let srcH = h; // Default to kaleidoscope canvas height
          
          if (bodyValid && bodyCanvas) {
            // Use body canvas dimensions directly - it matches the video aspect ratio
            srcW = bodyCanvas.width;
            srcH = bodyCanvas.height;
          } else if (bgValid && bgCanvas) {
            srcW = bgCanvas.width;
            srcH = bgCanvas.height;
          } else if (blobValid && blobCanvas) {
            srcW = blobCanvas.width;
            srcH = blobCanvas.height;
          } else if (poseValid && poseCanvas) {
            srcW = poseCanvas.width;
            srcH = poseCanvas.height;
          }
          
          // Draw bottom half normally
          const bottomHalfH = srcH / 2;
          drawLayers(0, bottomHalfH, srcW, bottomHalfH, 0, halfH, w, halfH);
          
          // Mirror to top half
          ctx.save();
          ctx.scale(1, -1);
          ctx.translate(0, -halfH);
          drawLayers(0, bottomHalfH, srcW, bottomHalfH, 0, 0, w, halfH);
          ctx.restore();
          
        } else if (mode === 'vertical') {
          // Take left half and mirror it to right
          const halfW = w / 2;
          
          // Use the body effects canvas dimensions as the primary source (it matches video aspect ratio)
          // Fall back to other canvases if body canvas isn't available
          let srcW = w; // Default to kaleidoscope canvas width
          let srcH = h; // Default to kaleidoscope canvas height
          
          if (bodyValid && bodyCanvas) {
            // Use body canvas dimensions directly - it matches the video aspect ratio
            srcW = bodyCanvas.width;
            srcH = bodyCanvas.height;
          } else if (bgValid && bgCanvas) {
            srcW = bgCanvas.width;
            srcH = bgCanvas.height;
          } else if (blobValid && blobCanvas) {
            srcW = blobCanvas.width;
            srcH = blobCanvas.height;
          } else if (poseValid && poseCanvas) {
            srcW = poseCanvas.width;
            srcH = poseCanvas.height;
          }
          
          // Draw left half normally
          const leftHalfW = srcW / 2;
          drawLayers(0, 0, leftHalfW, srcH, 0, 0, halfW, h);
          
          // Mirror to right half
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          drawLayers(0, 0, leftHalfW, srcH, 0, 0, halfW, h);
          ctx.restore();
          
        } else if (mode === 'radial') {
          // 4-way mirror from top-left quadrant
          const halfW = w / 2;
          const halfH = h / 2;
          
          // Top-left (original) - only use valid canvas dimensions
          const validWidths = [
            bgValid ? bgCanvas?.width : null,
            bodyValid ? bodyCanvas?.width : null,
            blobValid ? blobCanvas?.width : null,
            poseValid ? poseCanvas?.width : null
          ].filter((w): w is number => w !== null && w !== undefined && w > 0);
          
          const validHeights = [
            bgValid ? bgCanvas?.height : null,
            bodyValid ? bodyCanvas?.height : null,
            blobValid ? blobCanvas?.height : null,
            poseValid ? poseCanvas?.height : null
          ].filter((h): h is number => h !== null && h !== undefined && h > 0);
          
          const srcW = validWidths.length > 0 
            ? Math.max(1, Math.floor(Math.min(...validWidths) / 2))
            : 0;
          const srcH = validHeights.length > 0 
            ? Math.max(1, Math.floor(Math.min(...validHeights) / 2))
            : 0;
            
          if (srcW > 0 && srcH > 0) {
            drawLayers(0, 0, srcW, srcH, 0, 0, halfW, halfH);
          }
          
          // Top-right (horizontal flip)
          ctx.save();
          ctx.scale(-1, 1);
          if (srcW > 0 && srcH > 0) {
            drawLayers(0, 0, srcW, srcH, -w, 0, halfW, halfH);
          }
          ctx.restore();
          
          // Bottom-left (vertical flip)
          ctx.save();
          ctx.scale(1, -1);
          if (srcW > 0 && srcH > 0) {
            drawLayers(0, 0, srcW, srcH, 0, -h, halfW, halfH);
          }
          ctx.restore();
          
          // Bottom-right (both flips)
          ctx.save();
          ctx.scale(-1, -1);
          if (srcW > 0 && srcH > 0) {
            drawLayers(0, 0, srcW, srcH, -w, -h, halfW, halfH);
          }
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