import { useEffect, useRef } from "react";
import { drawLogoWatermarkGrid } from "@/app/recording/watermarkLogo";

const WATERMARK_OPACITY = 0.2;

interface WatermarkLayerProps {
  /** When true, the watermark canvas is shown (e.g. when user is not signed in). */
  show: boolean;
  /** Video source for aspect-ratio matching (same as other layers). */
  videoSource?: HTMLVideoElement | MediaStream | null;
}

export function WatermarkLayer({ show, videoSource }: WatermarkLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: false });
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w <= 0 || h <= 0) return;
      ctx.clearRect(0, 0, w, h);
      drawLogoWatermarkGrid(ctx, w, h, WATERMARK_OPACITY);
    };

    const resize = () => {
      if (!canvas) return;
      const viewportHeight = document.documentElement.clientHeight;
      const viewportWidth = document.documentElement.clientWidth;
      let canvasWidth: number;
      let canvasHeight: number;
      let shouldCenter = false;

      const bodyCanvas = document.querySelector("canvas.body-effects-canvas") as HTMLCanvasElement | undefined;
      if (bodyCanvas && bodyCanvas.width > 0 && bodyCanvas.height > 0) {
        canvasWidth = bodyCanvas.width;
        canvasHeight = bodyCanvas.height;
        shouldCenter = !!(videoSource && videoSource instanceof HTMLVideoElement);
      } else if (videoSource && videoSource instanceof HTMLVideoElement) {
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
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = shouldCenter ? "50%" : "0";
      canvas.style.transform = shouldCenter ? "translateX(-50%)" : "none";

      draw();
    };

    resize();
    window.addEventListener("resize", resize);

    if (videoSource && videoSource instanceof HTMLVideoElement) {
      videoSource.addEventListener("loadedmetadata", resize);
    }

    const bodyCanvas = document.querySelector("canvas.body-effects-canvas");
    const bodyCanvasObserver = new MutationObserver(() => resize());
    if (bodyCanvas) {
      bodyCanvasObserver.observe(bodyCanvas, {
        attributes: true,
        attributeFilter: ["width", "height", "style"],
      });
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (videoSource && videoSource instanceof HTMLVideoElement) {
        videoSource.removeEventListener("loadedmetadata", resize);
      }
      bodyCanvasObserver.disconnect();
    };
  }, [show, videoSource]);

  if (!show) return null;

  return (
    <canvas
      ref={canvasRef}
      className="watermark-layer-canvas pointer-events-none z-[25]"
      aria-hidden
    />
  );
}
