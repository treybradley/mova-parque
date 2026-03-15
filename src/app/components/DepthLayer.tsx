import { useRef, useEffect, useState } from "react";
import { DepthEstimator } from "@/app/depth-anything/utils/depthEstimation";
import {
  applyDepthEffect,
  type DepthEffectOptions,
} from "@/app/depth-anything/utils/depthEffects";

const MODEL_URL =
  "https://huggingface.co/depth-anything/Depth-Anything-V2-Small/resolve/main/depth_anything_v2_vits.onnx";

export type DepthLayerStyle = "depthMap" | "heatmap" | "xray";

export interface DepthLayerConfig {
  enabled: boolean;
  style: DepthLayerStyle;
  intensity: number;
  depthRange: [number, number];
}

interface DepthLayerProps {
  videoSource: HTMLVideoElement | null;
  sharedWebcamVideoRef: React.RefObject<HTMLVideoElement | null>;
  config: DepthLayerConfig;
  /** When true, we have an active video (upload or webcam). */
  hasVideo: boolean;
  /** When true, webcam video has ref and valid dimensions (so we can start the loop after switching to webcam). */
  webcamVideoReady?: boolean;
}

export function DepthLayer({
  videoSource,
  sharedWebcamVideoRef,
  config,
  hasVideo,
  webcamVideoReady = false,
}: DepthLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [estimator] = useState(() => new DepthEstimator(MODEL_URL));
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const rafRef = useRef<number>();

  const activeVideo =
    videoSource ?? (sharedWebcamVideoRef?.current ?? null);
  const videoReady = videoSource != null || webcamVideoReady;

  useEffect(() => {
    let mounted = true;
    (async () => {
      await estimator.initialize();
      if (mounted) setIsModelLoaded(true);
    })();
    return () => {
      mounted = false;
      estimator.dispose();
    };
  }, [estimator]);

  // When depth is disabled, clear canvas size so it's not composited
  useEffect(() => {
    if (!config.enabled && canvasRef.current) {
      canvasRef.current.width = 0;
      canvasRef.current.height = 0;
    }
  }, [config.enabled]);

  // When video is removed (webcam off or upload cleared), clear canvas so last frame doesn't persist
  useEffect(() => {
    if (!hasVideo && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
    }
  }, [hasVideo]);

  useEffect(() => {
    if (
      !config.enabled ||
      !hasVideo ||
      !isModelLoaded ||
      !videoReady ||
      !activeVideo ||
      !canvasRef.current
    ) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const isUpload = videoSource != null;

    const processFrame = async () => {
      const video = videoSource ?? sharedWebcamVideoRef?.current ?? null;
      if (!video || video.paused || video.ended) {
        const ctx = canvas.getContext("2d");
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }
      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        const ctx = canvas.getContext("2d");
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const videoAspect = video.videoWidth / video.videoHeight;
      // Match BodySegmentationLayer: no rounding for upload; full viewport for webcam
      const canvasWidth = isUpload
        ? viewportHeight * videoAspect
        : viewportWidth;
      const canvasHeight = viewportHeight;

      try {
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          canvas.style.width = `${canvasWidth}px`;
          canvas.style.height = `${canvasHeight}px`;
          canvas.style.position = "fixed";
          canvas.style.top = "0";
          if (isUpload) {
            canvas.style.left = "50%";
            canvas.style.transform = "translateX(-50%)";
          } else {
            canvas.style.left = "0";
            canvas.style.transform = "none";
          }
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          rafRef.current = requestAnimationFrame(processFrame);
          return;
        }

        // Draw video: for webcam use "cover" so aspect ratio matches raw feed (no squishing)
        if (isUpload) {
          ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
        } else {
          const scale = Math.max(
            canvasWidth / video.videoWidth,
            canvasHeight / video.videoHeight
          );
          const coverW = canvasWidth / scale;
          const coverH = canvasHeight / scale;
          const srcX = (video.videoWidth - coverW) / 2;
          const srcY = (video.videoHeight - coverH) / 2;
          ctx.drawImage(
            video,
            srcX, srcY, coverW, coverH,
            0, 0, canvasWidth, canvasHeight
          );
        }

        const frameData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const depthMap = await estimator.estimateDepth(frameData);

        if (config.style === "depthMap") {
          ctx.putImageData(depthMap, 0, 0);
        } else {
          if (isUpload) {
            ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
          } else {
            const scale = Math.max(
              canvasWidth / video.videoWidth,
              canvasHeight / video.videoHeight
            );
            const coverW = canvasWidth / scale;
            const coverH = canvasHeight / scale;
            const srcX = (video.videoWidth - coverW) / 2;
            const srcY = (video.videoHeight - coverH) / 2;
            ctx.drawImage(
              video,
              srcX, srcY, coverW, coverH,
              0, 0, canvasWidth, canvasHeight
            );
          }
          const originalData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
          const effectType: "heatmap" | "xray" =
            config.style === "heatmap" ? "heatmap" : "xray";
          const effectOptions: DepthEffectOptions = {
            effectType,
            intensity: config.intensity,
            depthRange: config.depthRange,
          };
          const effectData = applyDepthEffect(originalData, depthMap, effectOptions);
          ctx.putImageData(effectData, 0, 0);
        }
      } catch (e) {
        console.error("DepthLayer frame error:", e);
      }

      rafRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    config.enabled,
    config.style,
    config.intensity,
    config.depthRange,
    hasVideo,
    isModelLoaded,
    videoReady,
    activeVideo,
    videoSource,
    sharedWebcamVideoRef,
    estimator,
  ]);

  if (!config.enabled) {
    return (
      <canvas
        ref={canvasRef}
        className="depth-layer-canvas pointer-events-none fixed top-0 left-0 opacity-0"
        style={{ width: 0, height: 0 }}
        aria-hidden
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="depth-layer-canvas pointer-events-none z-[1]"
      aria-hidden
    />
  );
}
