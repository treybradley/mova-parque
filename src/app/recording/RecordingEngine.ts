import type {
  VideoSourceForRecording,
  RecordingDimensions,
  StartRecordingOptions,
  RecordingEngineHandle,
  ExportFrameRate,
} from "./types";
import { drawLogoWatermarkGrid } from "./watermarkLogo";
import { interpolatePoseAtTime } from "./poseInterpolation";
import { drawPoseOverlayOnContext } from "@/utils/drawPoseOverlay";
import {
  attachCardsRecordTrack,
  beginCardsRecordTarget,
  endCardsRecordTarget,
} from "@/app/ghost-cards/cardsRecordBridge";

/** Map CSS blend mode names to canvas globalCompositeOperation (normal → source-over). */
function toCanvasCompositeOperation(blendMode: string): GlobalCompositeOperation {
  return blendMode === "normal" ? "source-over" : (blendMode as GlobalCompositeOperation);
}

/** Match BodySegmentationLayer: container opacity × effects canvas opacity-95. */
function getBodyLayerAlpha(blendMode: string, haziness: number): number {
  const shouldApplyBlendMode = blendMode !== "normal";
  const containerOpacity = shouldApplyBlendMode ? 0.85 + haziness * 0.15 : 1.0;
  return containerOpacity * 0.95;
}

/**
 * Returns recording dimensions from the current video source.
 * - Upload: uses videoSource.metadata.width/height.
 * - Webcam: uses first video track getSettings(), fallback 640x480.
 */
export function getRecordingDimensions(
  videoSource: VideoSourceForRecording,
  cameraStream: MediaStream | null
): RecordingDimensions {
  if (videoSource.type === "upload" && videoSource.metadata) {
    const w = videoSource.metadata.width ?? 0;
    const h = videoSource.metadata.height ?? 0;
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  if (cameraStream) {
    const track = cameraStream.getVideoTracks()[0];
    if (track) {
      const settings = track.getSettings();
      const w = settings.width ?? 0;
      const h = settings.height ?? 0;
      if (w > 0 && h > 0) return { width: w, height: h };
    }
  }
  return { width: 640, height: 480 };
}

function clampFrameRate(fps: number): number {
  if (!Number.isFinite(fps) || fps <= 0) return 30;
  // Keep encode in a practical range; round to nearest integer.
  return Math.round(Math.min(60, Math.max(15, fps)));
}

/**
 * Best-effort source frame rate for export (no UI override).
 * - Webcam: MediaStreamTrack.getSettings().frameRate
 * - Upload: video.captureStream track settings when available
 * - Fallback: 30
 */
export function getRecordingFrameRate(
  videoSource: VideoSourceForRecording,
  cameraStream: MediaStream | null
): number {
  if (videoSource.type === "webcam" && cameraStream) {
    const track = cameraStream.getVideoTracks()[0];
    const fps = track?.getSettings()?.frameRate;
    if (typeof fps === "number" && fps > 0) return clampFrameRate(fps);
  }

  if (videoSource.type === "upload" && videoSource.videoElement) {
    const el = videoSource.videoElement;
    try {
      if (typeof el.captureStream === "function") {
        const vs = el.captureStream();
        const track = vs.getVideoTracks()[0];
        const fps = track?.getSettings()?.frameRate;
        vs.getTracks().forEach((t) => t.stop());
        if (typeof fps === "number" && fps > 0) return clampFrameRate(fps);
      }
    } catch {
      // captureStream may throw if element isn't ready; fall through
    }
  }

  return 30;
}

function pickRecorderMime(): { mimeType: string; extension: string } {
  const mimeType = MediaRecorder.isTypeSupported("video/mp4")
    ? "video/mp4"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
  const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
  return { mimeType, extension };
}

/**
 * Cards mode: record a stable source-sized 2D canvas.
 * GhostCardDeck blits after each GL present and calls requestFrame() when
 * supported so encode gets one sample per rendered frame.
 */
function startCardsRecording(
  frameRate: ExportFrameRate,
  videoBitsPerSecond: number,
  width: number,
  height: number
): RecordingEngineHandle {
  const glCanvas = document.querySelector(
    "canvas.ghost-cards-canvas"
  ) as HTMLCanvasElement | null;
  if (!glCanvas || glCanvas.width <= 1 || glCanvas.height <= 1) {
    throw new Error("Cards WebGL canvas not ready for recording");
  }

  const recordCanvas = beginCardsRecordTarget(width, height);
  const chunks: Blob[] = [];
  const { mimeType, extension } = pickRecorderMime();

  // Prefer manual frames (captureStream(0) + requestFrame). Fall back to fps hint.
  let stream: MediaStream;
  try {
    stream = recordCanvas.captureStream(0);
  } catch {
    stream = recordCanvas.captureStream(frameRate);
  }
  const track = stream.getVideoTracks()[0] ?? null;
  const canRequestFrame =
    typeof (track as { requestFrame?: unknown } | null)?.requestFrame ===
    "function";
  if (!canRequestFrame && track) {
    // No requestFrame — restart with fps-driven capture so canvas dirties encode
    stream.getTracks().forEach((t) => t.stop());
    stream = recordCanvas.captureStream(frameRate);
  }
  attachCardsRecordTrack(stream.getVideoTracks()[0] ?? null);

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond,
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  mediaRecorder.start(100);

  const finish = (
    resolve: (value: import("./types").RecordingResult) => void
  ) => {
    endCardsRecordTarget();
    stream.getTracks().forEach((t) => t.stop());
    resolve({
      blob: new Blob(chunks, { type: mimeType }),
      extension,
    });
  };

  return {
    stop: () =>
      new Promise<import("./types").RecordingResult>((resolve, reject) => {
        mediaRecorder.onstop = () => finish(resolve);
        mediaRecorder.onerror = () => {
          endCardsRecordTarget();
          reject(new Error("MediaRecorder error"));
        };
        if (mediaRecorder.state === "inactive") {
          finish(resolve);
          return;
        }
        mediaRecorder.stop();
      }),
  };
}

/**
 * Composites the current visual stack (kaleidoscope or layers + grain) into an offscreen canvas
 * and records via MediaRecorder. Stop returns a Blob for download.
 * Cards mode uses WebGL captureStream directly (see startCardsRecording).
 */
export function startRecording(
  options: StartRecordingOptions
): RecordingEngineHandle {
  const {
    width: destW,
    height: destH,
    frameRate,
    videoBitsPerSecond = 2_500_000,
    kaleidoscopeMode,
    grainIntensity,
    showRawVideo,
    rawVideoElement,
    rawVideoOpacity,
    layerToggles,
    blendMode = "normal",
    haziness = 0.8,
  } = options;

  const {
    bodySegmentationEnabled,
    motionAnalysisEnabled,
    blobTrackingEnabled,
    showGhostTrails,
    depthEnabled,
  } = layerToggles;

  const applyWatermark = options.applyWatermark ?? false;
  const poseExport = options.poseExport ?? null;
  const cardsMode = options.cardsMode ?? false;

  if (cardsMode) {
    return startCardsRecording(frameRate, videoBitsPerSecond, destW, destH);
  }

  const recordingCanvas = document.createElement("canvas");
  recordingCanvas.width = destW;
  recordingCanvas.height = destH;
  const ctx = recordingCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not get 2d context for recording canvas");
  }

  let rafId: number | null = null;
  const chunks: Blob[] = [];
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;

  const msPerFrame = 1000 / frameRate;

  const captureFrame = () => {
    ctx.clearRect(0, 0, destW, destH);

    const kaleidoscopeCanvas = document.querySelector(
      ".kaleidoscope-canvas"
    ) as HTMLCanvasElement | undefined;

    const useKaleidoscope =
      kaleidoscopeMode !== "none" &&
      kaleidoscopeCanvas &&
      kaleidoscopeCanvas.width > 1 &&
      kaleidoscopeCanvas.height > 1;
    if (useKaleidoscope) {
      // Draw raw video first only when depth is off (when depth on, kaleidoscope already has depth as base)
      if (!depthEnabled && showRawVideo && rawVideoElement && rawVideoElement.readyState >= 2) {
        const vw = rawVideoElement.videoWidth;
        const vh = rawVideoElement.videoHeight;
        if (vw > 0 && vh > 0) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = Math.max(0, Math.min(1, rawVideoOpacity));
          ctx.drawImage(rawVideoElement, 0, 0, vw, vh, 0, 0, destW, destH);
          ctx.globalAlpha = 1;
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(
        kaleidoscopeCanvas,
        0,
        0,
        kaleidoscopeCanvas.width,
        kaleidoscopeCanvas.height,
        0,
        0,
        destW,
        destH
      );
      // Film grain on top (matches FilmGrainLayer: overlay blend, intensity * 5 opacity)
      const filmGrainCanvas = document.querySelector("canvas.film-grain-canvas") as HTMLCanvasElement | undefined;
      if (grainIntensity >= 0.001 && filmGrainCanvas && filmGrainCanvas.width > 1 && filmGrainCanvas.height > 1) {
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = Math.min(1, grainIntensity * 5);
        ctx.drawImage(filmGrainCanvas, 0, 0, filmGrainCanvas.width, filmGrainCanvas.height, 0, 0, destW, destH);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      if (applyWatermark) {
        ctx.globalCompositeOperation = "source-over";
        drawLogoWatermarkGrid(ctx, destW, destH, 0.2);
      }
    } else {
      // When ghost trails are off, use current-frame-only canvas so export has no ghosts
      const bodyCanvas = document.querySelector(
        showGhostTrails ? "canvas.body-effects-canvas" : "canvas.body-export-canvas"
      ) as HTMLCanvasElement | undefined;
      const blobCanvas = document.querySelector(
        "canvas.blob-tracking-canvas"
      ) as HTMLCanvasElement | undefined;
      const poseCanvas = document.querySelector(
        "canvas.pose-estimation-canvas"
      ) as HTMLCanvasElement | undefined;
      const depthCanvas = document.querySelector(
        "canvas.depth-layer-canvas"
      ) as HTMLCanvasElement | undefined;

      const bodyValid = bodyCanvas && bodyCanvas.width > 1 && bodyCanvas.height > 1;
      const blobValid = blobCanvas && blobCanvas.width > 1 && blobCanvas.height > 1;
      const poseValid = poseCanvas && poseCanvas.width > 1 && poseCanvas.height > 1;
      const depthValid = depthCanvas && depthCanvas.width > 1 && depthCanvas.height > 1;

      if (!bodyValid && !blobValid && !poseValid && !depthValid) return;

      if (depthEnabled && depthValid && depthCanvas) {
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(depthCanvas, 0, 0, depthCanvas.width, depthCanvas.height, 0, 0, destW, destH);
      }
      if (!depthEnabled && showRawVideo && rawVideoElement && rawVideoElement.readyState >= 2) {
        const vw = rawVideoElement.videoWidth;
        const vh = rawVideoElement.videoHeight;
        if (vw > 0 && vh > 0) {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = Math.max(0, Math.min(1, rawVideoOpacity));
          ctx.drawImage(rawVideoElement, 0, 0, vw, vh, 0, 0, destW, destH);
          ctx.globalAlpha = 1;
        }
      }
      if (bodySegmentationEnabled && bodyValid && bodyCanvas) {
        ctx.globalCompositeOperation = toCanvasCompositeOperation(blendMode);
        ctx.globalAlpha = getBodyLayerAlpha(blendMode, haziness);
        ctx.drawImage(bodyCanvas, 0, 0, bodyCanvas.width, bodyCanvas.height, 0, 0, destW, destH);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      if (motionAnalysisEnabled) {
        let drewPose = false;
        if (!useKaleidoscope && poseExport?.style.showSkeleton) {
          const interp = interpolatePoseAtTime(
            poseExport.getSamples(),
            poseExport.getVideoCurrentTime()
          );
          if (interp) {
            ctx.globalCompositeOperation = "source-over";
            drawPoseOverlayOnContext(
              ctx,
              destW,
              destH,
              interp.keypoints,
              interp.metrics,
              poseExport.style,
              {
                confidenceThreshold: poseExport.confidenceThreshold,
                clearFullCanvas: false,
              }
            );
            drewPose = true;
          }
        }
        if (!drewPose && poseValid && poseCanvas) {
          ctx.globalCompositeOperation = "source-over";
          ctx.drawImage(poseCanvas, 0, 0, poseCanvas.width, poseCanvas.height, 0, 0, destW, destH);
        }
      }
      if (blobTrackingEnabled && blobValid && blobCanvas) {
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(blobCanvas, 0, 0, blobCanvas.width, blobCanvas.height, 0, 0, destW, destH);
      }
      // Film grain on top (matches FilmGrainLayer: overlay blend, intensity * 5 opacity)
      const filmGrainCanvas = document.querySelector("canvas.film-grain-canvas") as HTMLCanvasElement | undefined;
      if (grainIntensity >= 0.001 && filmGrainCanvas && filmGrainCanvas.width > 1 && filmGrainCanvas.height > 1) {
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = Math.min(1, grainIntensity * 5);
        ctx.drawImage(filmGrainCanvas, 0, 0, filmGrainCanvas.width, filmGrainCanvas.height, 0, 0, destW, destH);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      if (applyWatermark) {
        ctx.globalCompositeOperation = "source-over";
        drawLogoWatermarkGrid(ctx, destW, destH, 0.2);
      }
    }
  };

  stream = recordingCanvas.captureStream(frameRate);

  const { mimeType, extension } = pickRecorderMime();

  mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond,
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.start(100);

  // Drive capture with rAF so we sample after paint (avoids kaleidoscope flicker in export)
  let nextCaptureTime = 0;
  const recordingTick = (now: number) => {
    if (nextCaptureTime === 0) nextCaptureTime = now;
    if (now >= nextCaptureTime) {
      captureFrame();
      nextCaptureTime += msPerFrame;
    }
    rafId = requestAnimationFrame(recordingTick);
  };
  rafId = requestAnimationFrame(recordingTick);

  return {
    stop: () =>
      new Promise<import("./types").RecordingResult>((resolve, reject) => {
        if (!mediaRecorder) {
          resolve({
            blob: new Blob(chunks, { type: mimeType }),
            extension,
          });
          return;
        }
        if (rafId != null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        const recorder = mediaRecorder;
        mediaRecorder = null;
        recorder.onstop = () => {
          stream?.getTracks().forEach((t) => t.stop());
          resolve({
            blob: new Blob(chunks, { type: mimeType }),
            extension,
          });
        };
        recorder.onerror = () => reject(new Error("MediaRecorder error"));
        if (recorder.state === "inactive") {
          stream?.getTracks().forEach((t) => t.stop());
          resolve({
            blob: new Blob(chunks, { type: mimeType }),
            extension,
          });
          return;
        }
        recorder.stop();
      }),
  };
}
