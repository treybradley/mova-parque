import type {
  VideoSourceForRecording,
  RecordingDimensions,
  StartRecordingOptions,
  RecordingEngineHandle,
} from "./types";
import { drawLogoWatermarkGrid } from "./watermarkLogo";

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

/**
 * Composites the current visual stack (kaleidoscope or layers + grain) into an offscreen canvas
 * and records via MediaRecorder. Stop returns a Blob for download.
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
    showRawVideo,
    rawVideoElement,
    rawVideoOpacity,
    layerToggles,
  } = options;

  const {
    bodySegmentationEnabled,
    motionAnalysisEnabled,
    blobTrackingEnabled,
    showBackground,
    showGhostTrails,
  } = layerToggles;

  const applyWatermark = options.applyWatermark ?? false;

  const recordingCanvas = document.createElement("canvas");
  recordingCanvas.width = destW;
  recordingCanvas.height = destH;
  const ctx = recordingCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not get 2d context for recording canvas");
  }

  let intervalId: ReturnType<typeof setInterval> | null = null;
  const chunks: Blob[] = [];
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;

  const captureFrame = () => {
    ctx.clearRect(0, 0, destW, destH);
    const kaleidoscopeCanvas = document.querySelector(
      ".kaleidoscope-canvas"
    ) as HTMLCanvasElement | undefined;

    const useKaleidoscope =
      kaleidoscopeMode !== "none" &&
      kaleidoscopeCanvas &&
      kaleidoscopeCanvas.width > 1 &&
      kaleidoscopeCanvas.height > 1 &&
      !showRawVideo;
    if (useKaleidoscope) {
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
      if (applyWatermark) {
        ctx.globalCompositeOperation = "source-over";
        drawLogoWatermarkGrid(ctx, destW, destH, 0.2);
      }
    } else {
      const allCanvases = document.querySelectorAll(
        "canvas:not(.kaleidoscope-canvas):not(.film-grain-canvas):not(.watermark-layer-canvas)"
      );
      const bgCanvas = allCanvases[0] as HTMLCanvasElement | undefined;
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

      const bgValid = bgCanvas && bgCanvas.width > 1 && bgCanvas.height > 1;
      const bodyValid = bodyCanvas && bodyCanvas.width > 1 && bodyCanvas.height > 1;
      const blobValid = blobCanvas && blobCanvas.width > 1 && blobCanvas.height > 1;
      const poseValid = poseCanvas && poseCanvas.width > 1 && poseCanvas.height > 1;

      if (!bgValid && !bodyValid && !blobValid && !poseValid) return;

      if (showBackground && bgValid && bgCanvas) {
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(bgCanvas, 0, 0, bgCanvas.width, bgCanvas.height, 0, 0, destW, destH);
      }
      if (showRawVideo && rawVideoElement && rawVideoElement.readyState >= 2) {
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
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(bodyCanvas, 0, 0, bodyCanvas.width, bodyCanvas.height, 0, 0, destW, destH);
      }
      if (motionAnalysisEnabled && poseValid && poseCanvas) {
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(poseCanvas, 0, 0, poseCanvas.width, poseCanvas.height, 0, 0, destW, destH);
      }
      if (blobTrackingEnabled && blobValid && blobCanvas) {
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(blobCanvas, 0, 0, blobCanvas.width, blobCanvas.height, 0, 0, destW, destH);
      }

      if (applyWatermark) {
        ctx.globalCompositeOperation = "source-over";
        drawLogoWatermarkGrid(ctx, destW, destH, 0.2);
      }
    }
  };

  stream = recordingCanvas.captureStream(frameRate);

  // Prefer H.264/MP4 (Safari + Chrome); fall back to WebM if unsupported
  const mimeType = MediaRecorder.isTypeSupported("video/mp4")
    ? "video/mp4"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
  const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";

  mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond,
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.start(100);

  const msPerFrame = 1000 / frameRate;
  intervalId = setInterval(captureFrame, msPerFrame);

  return {
    stop: () =>
      new Promise<import("./types").RecordingResult>((resolve, reject) => {
        if (!intervalId || !mediaRecorder) {
          resolve({
            blob: new Blob(chunks, { type: mimeType }),
            extension,
          });
          return;
        }
        clearInterval(intervalId);
        intervalId = null;

        mediaRecorder!.onstop = () => {
          stream?.getTracks().forEach((t) => t.stop());
          resolve({
            blob: new Blob(chunks, { type: mimeType }),
            extension,
          });
        };
        mediaRecorder!.onerror = () => reject(new Error("MediaRecorder error"));
        mediaRecorder!.stop();
        mediaRecorder = null;
      }),
  };
}
