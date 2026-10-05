import { useEffect, useRef, useState } from 'react';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import * as tf from '@tensorflow/tfjs';
import type { TrailView } from '@/app/ghost-cards/constants';
import { CARDS_MAX_HISTORY } from '@/app/ghost-cards/constants';
import {
  publishGhostCapture,
  publishGhostDimensions,
} from '@/app/ghost-cards/ghostFrameBridge';

interface BodySegmentationLayerProps {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  videoSource?: HTMLVideoElement | null; // Optional video element for uploaded videos
  sharedWebcamVideoRef?: React.RefObject<HTMLVideoElement | null>; // For webcam: shared video element
  bodyEffects: {
    ghostTrail: number;
    ghostFrames: number;
    ghostDecay: number;
    trailColorGradient: number;
    ghostSpeed: number;
    showGhostTrails: boolean;
  };
  mood: {
    brightness: number;
  };
  distortion?: {
    warp: number;
    chromatic: number;
    noise: number;
  };
  atmosphere: {
    haziness: number;
    depth: number;
    blendMode?: string;
  };
  /** When true with ghost trails, silhouettes sample Depth Anything output instead of raw video. */
  depthEnabled?: boolean;
  /** Flat = 2D ghost composite; Cards = current-frame only here (history lives in 3D deck). */
  trailView?: TrailView;
  enabled: boolean;
}

export function BodySegmentationLayer({ onCanvasReady, videoSource, bodyEffects, mood, distortion, atmosphere, depthEnabled = false, trailView = 'flat', enabled, sharedWebcamVideoRef }: BodySegmentationLayerProps) {
  // Use shared video ref for webcam, or create own if not provided
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null); // Current-frame-only, used by recording when ghost trails are off
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null); // Reusable temp canvas for renderEffects
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const segmenterRef = useRef<bodySegmentation.BodySegmenter | null>(null);
  const timeRef = useRef(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const isProcessingRef = useRef<boolean>(false);
  const moodRef = useRef(mood);
  const bodyEffectsRef = useRef(bodyEffects);
  const distortionRef = useRef(distortion);
  const atmosphereRef = useRef(atmosphere);
  const depthEnabledRef = useRef(depthEnabled);
  const trailViewRef = useRef(trailView);

  // Update refs when props change
  useEffect(() => {
    moodRef.current = mood;
    bodyEffectsRef.current = bodyEffects;
    distortionRef.current = distortion;
    atmosphereRef.current = atmosphere;
    depthEnabledRef.current = depthEnabled;
    trailViewRef.current = trailView;
  }, [mood, bodyEffects, distortion, atmosphere, depthEnabled, trailView]);

  useEffect(() => {
    if (!enabled) return;

    let animationId: number;

    async function setupVideoSource() {
      try {
        // If videoSource prop is provided (uploaded video), use it directly
        if (videoSource && videoSource instanceof HTMLVideoElement) {
          console.log('Using uploaded video element');
          
          // Ensure video is playing and set up
          if (videoSource.paused) {
            await videoSource.play();
          }
          
          setIsLoading(false);
          return; // Skip webcam setup
        }
        
        // For webcam: wait for stream to be provided by parent (App.tsx)
        // Don't request webcam here - let the user control it via the button
        // The stream is managed by App.tsx and passed via sharedWebcamVideoRef
        setIsLoading(false);
      } catch (err) {
        setError('Video setup error');
        console.error('Video setup error:', err);
      }
    }

    async function loadModel() {
      try {
        // Ensure TensorFlow.js backend is ready
        await tf.ready();
        console.log('TensorFlow.js backend ready:', tf.getBackend());
        
        const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
        const segmenterConfig = {
          runtime: 'mediapipe' as const,
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
          modelType: 'general' as const,
        };

        console.log('Loading body segmentation model...');
        segmenterRef.current = await bodySegmentation.createSegmenter(model, segmenterConfig);
        console.log('Model loaded successfully');
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load model');
        console.error('Model loading error:', err);
      }
    }

    async function detectAndDraw() {
      // Determine which video element to use: videoSource prop (uploaded) or shared/own videoRef (webcam)
      const activeVideoElement = (videoSource && videoSource instanceof HTMLVideoElement) 
        ? videoSource 
        : (sharedWebcamVideoRef?.current || videoRef.current);
      
      if (
        !activeVideoElement ||
        !canvasRef.current ||
        !segmenterRef.current
      ) {
        animationId = requestAnimationFrame(detectAndDraw);
        return;
      }
      
      // Check if video is ready (readyState 4 = HAVE_ENOUGH_DATA)
      // For webcam, also check if videoWidth/Height are available
      const isVideoReady = activeVideoElement.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                          activeVideoElement.videoWidth > 0 &&
                          activeVideoElement.videoHeight > 0;
      
      if (!isVideoReady) {
        animationId = requestAnimationFrame(detectAndDraw);
        return;
      }

      // For uploaded videos only: sync with video playback by checking if time has advanced
      if (videoSource && videoSource instanceof HTMLVideoElement) {
        const currentVideoTime = activeVideoElement.currentTime;
        const timeDelta = Math.abs(currentVideoTime - lastVideoTimeRef.current);
        
        // Skip if we're already processing or if video hasn't advanced enough (new frame)
        // Use a small threshold (0.01s) to account for floating point precision
        if (isProcessingRef.current || timeDelta < 0.01) {
          animationId = requestAnimationFrame(detectAndDraw);
          return;
        }
        
        lastVideoTimeRef.current = currentVideoTime;
      }

      // Prevent concurrent processing (applies to both webcam and uploaded videos)
      if (isProcessingRef.current) {
        animationId = requestAnimationFrame(detectAndDraw);
        return;
      }

      isProcessingRef.current = true;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        isProcessingRef.current = false;
        return;
      }

      try {
        // Set canvas dimensions to match video
        // Guard against invalid dimensions (video not ready yet)
        const videoWidth = activeVideoElement.videoWidth || 640;
        const videoHeight = activeVideoElement.videoHeight || 480;
        
        if (videoWidth === 0 || videoHeight === 0) {
          // Video not ready yet, skip this frame
          isProcessingRef.current = false;
          animationId = requestAnimationFrame(detectAndDraw);
          return;
        }
        
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Perform segmentation
        const segmentation = await segmenterRef.current.segmentPeople(activeVideoElement);

        if (segmentation && segmentation.length > 0) {
          const maskResult = await bodySegmentation.toBinaryMask(
            segmentation,
            { r: 255, g: 255, b: 255, a: 255 },
            { r: 0, g: 0, b: 0, a: 0 }
          );
          
          // toBinaryMask returns an ImageData-like object with width, height, and data
          const mask = maskResult.data || maskResult;

          // Draw mask to main canvas
          // Reuse ImageData if canvas size hasn't changed (optimization)
          const imageData = ctx.createImageData(canvas.width, canvas.height);
          imageData.data.set(mask);
          ctx.putImageData(imageData, 0, 0);
        }
      } catch (err) {
        console.error('Error during detection:', err);
        setError(`Detection error: ${err instanceof Error ? err.message : 'Unknown'}`);
      } finally {
        isProcessingRef.current = false;
        animationId = requestAnimationFrame(detectAndDraw);
      }
    }

    setupVideoSource().then(() => {
      loadModel().then(() => {
        detectAndDraw();
      });
    });

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      // Don't stop stream here - it's managed by App.tsx
      // Only stop if we created it ourselves (which we no longer do)
    };
  }, [enabled, videoSource, sharedWebcamVideoRef]);

  // Separate effect for rendering visual effects on the body segmentation
  useEffect(() => {
    if (!enabled || !canvasRef.current || !effectsCanvasRef.current) return;

    const sourceCanvas = canvasRef.current;
    const effectsCanvas = effectsCanvasRef.current;
    const exportCanvas = exportCanvasRef.current;
    const effectsCtx = effectsCanvas.getContext('2d');
    if (!effectsCtx) return;
    
    // Notify parent when effects canvas is ready
    if (onCanvasReady) {
      onCanvasReady(effectsCanvas);
    }

    // Multi-frame buffer system for discrete ghost trail frames
    const frameBuffers: HTMLCanvasElement[] = [];
    let frameCounter = 0;
    let currentWidth = 0;
    let currentHeight = 0;

    // Initialize frame buffers based on ghostFrames setting
    const initializeFrameBuffers = (width: number, height: number, numFrames: number) => {
      // Clear existing buffers
      frameBuffers.length = 0;
      
      // Create new buffers
      for (let i = 0; i < numFrames; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        frameBuffers.push(canvas);
      }
    };

    let effectsAnimationId: number;
    let lastDepthGhostKey = "";

    const clearFrameBuffers = () => {
      for (let i = 0; i < frameBuffers.length; i++) {
        const bufCtx = frameBuffers[i].getContext("2d");
        if (bufCtx && frameBuffers[i].width > 0 && frameBuffers[i].height > 0) {
          bufCtx.clearRect(0, 0, frameBuffers[i].width, frameBuffers[i].height);
        }
      }
    };

    const renderEffects = () => {
      timeRef.current += 0.01;

      // Get viewport dimensions
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Determine which video element to use: videoSource prop (uploaded) or shared/own videoRef (webcam)
      const activeVideoElement = (videoSource && videoSource instanceof HTMLVideoElement) 
        ? videoSource 
        : (sharedWebcamVideoRef?.current || videoRef.current);
      
      // Get video dimensions
      const videoWidth = activeVideoElement?.videoWidth || 640;
      const videoHeight = activeVideoElement?.videoHeight || 480;
      const videoAspect = videoWidth / videoHeight;
      
      // Calculate canvas dimensions: full viewport for webcam, aspect ratio for uploaded video
      let canvasWidth: number;
      let canvasHeight: number;
      
      if (videoSource && videoSource instanceof HTMLVideoElement) {
        // Uploaded video: aspect ratio sizing (full viewport height, width adjusted)
        canvasHeight = viewportHeight;
        canvasWidth = canvasHeight * videoAspect;
      } else {
        // Webcam: full viewport (processing stays at webcam resolution, but display is full screen)
        canvasWidth = viewportWidth;
        canvasHeight = viewportHeight;
      }
      
      const frameCap =
        trailViewRef.current === "cards" ? CARDS_MAX_HISTORY : 90;
      const maxFrames = Math.max(
        3,
        Math.min(frameCap, Math.floor(bodyEffectsRef.current.ghostFrames))
      );

      // Resize or initialize buffers if needed (check both canvas dimensions and video aspect ratio)
      if (canvasWidth !== currentWidth || canvasHeight !== currentHeight || frameBuffers.length !== maxFrames) {
        // Set internal canvas resolution
        effectsCanvas.width = canvasWidth;
        effectsCanvas.height = canvasHeight;
        
        // Set display size to exactly match internal resolution for 1:1 pixel mapping
        // This ensures no scaling and maintains maximum sharpness
        effectsCanvas.style.width = `${canvasWidth}px`;
        effectsCanvas.style.height = `${canvasHeight}px`;
        
        // Position canvas: center for uploaded videos, full viewport for webcam
        if (videoSource && videoSource instanceof HTMLVideoElement) {
          effectsCanvas.style.position = 'fixed';
          effectsCanvas.style.top = '0';
          effectsCanvas.style.left = '50%';
          effectsCanvas.style.transform = 'translateX(-50%)';
        } else {
          effectsCanvas.style.position = 'fixed';
          effectsCanvas.style.top = '0';
          effectsCanvas.style.left = '0';
          effectsCanvas.style.transform = 'none';
        }
        
        currentWidth = canvasWidth;
        currentHeight = canvasHeight;
        initializeFrameBuffers(canvasWidth, canvasHeight, maxFrames);
        frameCounter = 0;
        publishGhostDimensions(canvasWidth, canvasHeight);
      }

      // Skip rendering if dimensions are invalid
      if (canvasWidth === 0 || canvasHeight === 0 || videoWidth === 0 || videoHeight === 0) {
        effectsAnimationId = requestAnimationFrame(renderEffects);
        return;
      }

      // Clear effects canvas
      effectsCtx.clearRect(0, 0, canvasWidth, canvasHeight);

      // When ghost trails are off, clear all frame buffers so no stale ghost content appears on export
      if (!bodyEffectsRef.current.showGhostTrails && frameBuffers.length > 0) {
        for (let i = 0; i < frameBuffers.length; i++) {
          const buf = frameBuffers[i];
          const bufCtx = buf.getContext('2d');
          if (bufCtx && buf.width > 0 && buf.height > 0) {
            bufCtx.clearRect(0, 0, buf.width, buf.height);
          }
        }
      }

      // Calculate frame capture rate based on ghostSpeed
      // ghostSpeed 0.0 = capture every 60 frames (1 second at 60fps) - very slow, long persistence
      // ghostSpeed 0.5 = capture every 10 frames
      // ghostSpeed 1.0 = capture every frame - fast, short persistence
      const frameSkip = Math.max(1, Math.floor(60 - (bodyEffectsRef.current.ghostSpeed * 59)));

      // === COMPOSITE ALL GHOST TRAIL FRAMES ===
      // Cards mode: skip flat ghost stack — history is rendered as 3D cards instead.
      if (
          trailViewRef.current === "flat" &&
          bodyEffectsRef.current.showGhostTrails && 
          bodyEffectsRef.current.ghostTrail > 0.05 && 
          frameBuffers.length > 0) {
        
        // Render all stored frames from oldest to newest
        // Only render buffers that have content
        // Enable high-quality image smoothing for crisp ghost trails
        effectsCtx.imageSmoothingEnabled = true;
        effectsCtx.imageSmoothingQuality = 'high';
        
        for (let i = 0; i < frameBuffers.length; i++) {
          const buffer = frameBuffers[i];
          
          // Skip if buffer has invalid dimensions
          if (buffer.width === 0 || buffer.height === 0 || !buffer.width || !buffer.height) continue;
          
          // Calculate age-based alpha (newer frames are more opaque)
          const age = i / Math.max(1, frameBuffers.length - 1); // 0 = oldest, 1 = newest
          const baseAlpha = bodyEffectsRef.current.ghostTrail;
          
          // Apply decay - older frames fade more
          // Use a gentler exponential curve
          const decayFactor = 1 - bodyEffectsRef.current.ghostDecay * 0.5;
          const alpha = baseAlpha * Math.pow(decayFactor, (1 - age) * 5); // Use 5 instead of frameBuffers.length for gentler falloff
          
          if (alpha > 0.02) {
            try {
              effectsCtx.globalAlpha = alpha;
              // Draw buffer at 1:1 scale to maintain sharpness
              effectsCtx.drawImage(buffer, 0, 0, buffer.width, buffer.height);
            } catch (err) {
              // Silently skip invalid buffer
              console.warn('Failed to draw buffer:', err);
            }
          }
        }
        
        effectsCtx.globalAlpha = 1;
      }

      // === CREATE/REUSE TEMP CANVAS FOR CURRENT FRAME WITH EFFECTS ===
      // Reuse temp canvas instead of creating new one every frame (avoid memory leaks)
      if (!tempCanvasRef.current || tempCanvasRef.current.width !== canvasWidth || tempCanvasRef.current.height !== canvasHeight) {
        if (!tempCanvasRef.current) {
          tempCanvasRef.current = document.createElement('canvas');
        }
        tempCanvasRef.current.width = canvasWidth;
        tempCanvasRef.current.height = canvasHeight;
      }
      const tempCanvas = tempCanvasRef.current;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.save();

      // === VIDEO AND MASK POSITIONING ===
      // For webcam: scale to fill canvas (cover behavior, crops edges)
      // For uploaded videos: fit entire video (contain behavior, adds bars)
      const sourceVideoWidth = activeVideoElement?.videoWidth || 640;
      const sourceVideoHeight = activeVideoElement?.videoHeight || 480;
      const sourceAspect = sourceVideoWidth / sourceVideoHeight;
      const canvasAspect = canvasWidth / canvasHeight;

      let drawWidth, drawHeight, drawX, drawY;

      if (videoSource && videoSource instanceof HTMLVideoElement) {
        // Uploaded video: maintain aspect ratio, fit entire video (contain behavior)
        if (canvasAspect > sourceAspect) {
          // Canvas is wider than video - fit to height (pillarboxing)
          drawHeight = canvasHeight;
          drawWidth = canvasHeight * sourceAspect;
          drawX = (canvasWidth - drawWidth) / 2;
          drawY = 0;
        } else {
          // Canvas is taller than video - fit to width (letterboxing)
          drawWidth = canvasWidth;
          drawHeight = canvasWidth / sourceAspect;
          drawX = 0;
          drawY = (canvasHeight - drawHeight) / 2;
        }
      } else {
        // Webcam: scale to fill canvas (cover behavior, crops edges if needed)
        if (canvasAspect > sourceAspect) {
          // Canvas is wider than video - scale to fill width (crop top/bottom)
          drawWidth = canvasWidth;
          drawHeight = canvasWidth / sourceAspect;
          drawX = 0;
          drawY = (canvasHeight - drawHeight) / 2;
        } else {
          // Canvas is taller than video - scale to fill height (crop left/right)
          drawHeight = canvasHeight;
          drawWidth = canvasHeight * sourceAspect;
          drawX = (canvasWidth - drawWidth) / 2;
          drawY = 0;
        }
      }

      const depthCanvas = document.querySelector(
        "canvas.depth-layer-canvas"
      ) as HTMLCanvasElement | undefined;
      const depthCanvasValid =
        depthCanvas != null && depthCanvas.width > 1 && depthCanvas.height > 1;
      const useDepthSource =
        depthEnabledRef.current &&
        bodyEffectsRef.current.showGhostTrails &&
        depthCanvasValid;

      const depthGhostKey = `${useDepthSource}-${bodyEffectsRef.current.showGhostTrails}-${depthEnabledRef.current}`;
      if (depthGhostKey !== lastDepthGhostKey) {
        clearFrameBuffers();
        lastDepthGhostKey = depthGhostKey;
      }

      // === COMPOSITE SOURCE THROUGH SEGMENTATION MASK ===
      // Default: raw video. When depth + ghost trails are both on, use depth-filtered frame.
      const maskReady = sourceCanvas.width > 0 && sourceCanvas.height > 0;
      const videoReady =
        activeVideoElement != null && activeVideoElement.readyState === 4;

      if (maskReady && (useDepthSource || videoReady)) {
        tempCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        tempCtx.globalCompositeOperation = "source-over";
        tempCtx.globalAlpha = 1;
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = "high";

        if (useDepthSource && depthCanvas) {
          tempCtx.drawImage(depthCanvas, 0, 0, canvasWidth, canvasHeight);
          tempCtx.globalCompositeOperation = "destination-in";
          if (videoSource && videoSource instanceof HTMLVideoElement) {
            // Match DepthLayer upload layout (full-canvas stretch)
            tempCtx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
          } else {
            tempCtx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);
          }
        } else if (activeVideoElement) {
          tempCtx.drawImage(
            activeVideoElement,
            drawX,
            drawY,
            drawWidth,
            drawHeight
          );
          tempCtx.globalCompositeOperation = "destination-in";
          tempCtx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);
        }

        tempCtx.globalCompositeOperation = "source-over";
        tempCtx.globalAlpha = 1;
      }

      tempCtx.restore();

      // Apply noise
      // Note: noise property doesn't exist in bodyEffects, skipping noise effect for now
      // if (bodyEffectsRef.current.noise > 0.05 && canvasWidth > 0 && canvasHeight > 0) {
      //   const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      //   const data = imageData.data;
      //   const noiseStrength = bodyEffectsRef.current.noise * 50;

      //   for (let i = 0; i < data.length; i += 4) {
      //     if (data[i + 3] > 10) {
      //       const noise = (Math.random() - 0.5) * noiseStrength;
      //       data[i] = Math.max(0, Math.min(255, data[i] + noise));
      //       data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      //       data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      //     }
      //   }

      //   tempCtx.putImageData(imageData, 0, 0);
      // }

      // Draw current frame on top of ghost trail
      effectsCtx.globalAlpha = 1;
      effectsCtx.imageSmoothingEnabled = true;
      effectsCtx.imageSmoothingQuality = 'high';
      if (tempCanvas.width > 0 && tempCanvas.height > 0) {
        // Draw at 1:1 scale to maintain sharpness
        effectsCtx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
      }

      // Update export canvas (current-frame-only) so recording can use it when ghost trails are off
      if (exportCanvas && tempCanvas.width > 0 && tempCanvas.height > 0) {
        if (exportCanvas.width !== canvasWidth || exportCanvas.height !== canvasHeight) {
          exportCanvas.width = canvasWidth;
          exportCanvas.height = canvasHeight;
        }
        const exportCtx = exportCanvas.getContext('2d');
        if (exportCtx) {
          exportCtx.clearRect(0, 0, canvasWidth, canvasHeight);
          exportCtx.imageSmoothingEnabled = true;
          exportCtx.imageSmoothingQuality = 'high';
          exportCtx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
        }
      }

      // === SAVE CURRENT FRAME TO FRAME BUFFER ===
      // Only store frames when ghost trails are on; when off, buffers are cleared above
      if (
        frameCounter % frameSkip === 0 &&
        frameBuffers.length > 0 &&
        bodyEffectsRef.current.showGhostTrails
      ) {
        // Rotate frame buffers (FIFO queue)
        const oldestFrame = frameBuffers.shift()!;
        const ctx = oldestFrame.getContext('2d');
        if (ctx && tempCanvas.width > 0 && tempCanvas.height > 0 && oldestFrame.width > 0 && oldestFrame.height > 0) {
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          // Enable high-quality smoothing when saving frames to buffer
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          // Draw at 1:1 scale to maintain sharpness
          ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
        }
        frameBuffers.push(oldestFrame);
        publishGhostCapture({ width: canvasWidth, height: canvasHeight });
      }
      
      frameCounter++;

      effectsAnimationId = requestAnimationFrame(renderEffects);
    };

    renderEffects();

    return () => {
      if (effectsAnimationId) {
        cancelAnimationFrame(effectsAnimationId);
      }
    };
  }, [enabled, videoSource, bodyEffects, mood, distortion, atmosphere, depthEnabled, trailView, sharedWebcamVideoRef]);

  if (!enabled) return null;

  // Calculate blend mode styles based on atmosphere settings
  const blendMode = atmosphere.blendMode || 'normal';
  const shouldApplyBlendMode = blendMode !== 'normal';
  
  // Calculate opacity - only reduce opacity if blend mode is active
  const containerOpacity = shouldApplyBlendMode ? (0.85 + (atmosphere.haziness * 0.15)) : 1.0; // 0.85-1.0 when blend mode active

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-[5]"
      style={{
        ...(shouldApplyBlendMode && { mixBlendMode: blendMode as any }),
        opacity: containerOpacity,
      }}
    >
      {/* Hidden video element for webcam */}
      <video
        ref={videoRef}
        className="hidden"
        width="640"
        height="480"
        playsInline
        muted
      />

      {/* Hidden canvas for body segmentation (processing only) */}
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        className="hidden"
      />

      {/* Effects canvas - visible with all artistic effects applied */}
      {/* Canvas is sized dynamically to match video aspect ratio, centered horizontally */}
      <canvas
        ref={effectsCanvasRef}
        className="body-effects-canvas opacity-95"
        style={{ 
          zIndex: 3,
          // Width and height are set dynamically in JavaScript to match video aspect ratio
        }}
      />

      {/* Export-only canvas: current frame only (no ghost trails). Used by recording when ghost trails are off. */}
      <canvas
        ref={exportCanvasRef}
        className="body-export-canvas"
        style={{ position: 'absolute', left: -9999, top: 0, pointerEvents: 'none' }}
        aria-hidden
      />

      {/* Loading/Error States */}
      {isLoading && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm">
          Loading camera...
        </div>
      )}
      {error && (
        <div className="absolute top-4 right-4 bg-red-500/80 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}