/**
 * Composites the current flat layer stack into a single canvas for card textures.
 * Mirrors RecordingEngine / KaleidoscopeLayer layer order, but uses current-frame-only
 * body canvas (no flat ghost trails) so Cards history is not double-ghosted.
 */

export type CardCompositeOptions = {
  dest: HTMLCanvasElement;
  includeBackground: boolean;
  kaleidoscopeMode: "none" | "horizontal" | "vertical" | "radial";
  blendMode: string;
  haziness: number;
  grainIntensity: number;
  showRawVideo: boolean;
  rawVideoElement: HTMLVideoElement | null;
  rawVideoOpacity: number;
  bodySegmentationEnabled: boolean;
  motionAnalysisEnabled: boolean;
  blobTrackingEnabled: boolean;
  depthEnabled: boolean;
};

function bodyLayerAlpha(blendMode: string, haziness: number): number {
  const shouldApplyBlendMode = blendMode !== "normal";
  const containerOpacity = shouldApplyBlendMode ? 0.85 + haziness * 0.15 : 1.0;
  return containerOpacity * 0.95;
}

function toCompositeOp(blendMode: string): GlobalCompositeOperation {
  return blendMode === "normal"
    ? "source-over"
    : (blendMode as GlobalCompositeOperation);
}

function drawLayersFlat(
  ctx: CanvasRenderingContext2D,
  destW: number,
  destH: number,
  options: CardCompositeOptions
): void {
  const {
    includeBackground,
    blendMode,
    haziness,
    grainIntensity,
    showRawVideo,
    rawVideoElement,
    rawVideoOpacity,
    bodySegmentationEnabled,
    motionAnalysisEnabled,
    blobTrackingEnabled,
    depthEnabled,
  } = options;

  const bodyCanvas = document.querySelector(
    "canvas.body-export-canvas"
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
  const filmGrainCanvas = document.querySelector(
    "canvas.film-grain-canvas"
  ) as HTMLCanvasElement | undefined;

  const bodyValid = !!(bodyCanvas && bodyCanvas.width > 1 && bodyCanvas.height > 1);
  const blobValid = !!(blobCanvas && blobCanvas.width > 1 && blobCanvas.height > 1);
  const poseValid = !!(poseCanvas && poseCanvas.width > 1 && poseCanvas.height > 1);
  const depthValid = !!(depthCanvas && depthCanvas.width > 1 && depthCanvas.height > 1);

  if (includeBackground && depthEnabled && depthValid && depthCanvas) {
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(
      depthCanvas,
      0,
      0,
      depthCanvas.width,
      depthCanvas.height,
      0,
      0,
      destW,
      destH
    );
  }

  if (
    includeBackground &&
    !depthEnabled &&
    showRawVideo &&
    rawVideoElement &&
    rawVideoElement.readyState >= 2
  ) {
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
    ctx.globalCompositeOperation = toCompositeOp(blendMode);
    ctx.globalAlpha = bodyLayerAlpha(blendMode, haziness);
    ctx.drawImage(
      bodyCanvas,
      0,
      0,
      bodyCanvas.width,
      bodyCanvas.height,
      0,
      0,
      destW,
      destH
    );
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  if (motionAnalysisEnabled && poseValid && poseCanvas) {
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(
      poseCanvas,
      0,
      0,
      poseCanvas.width,
      poseCanvas.height,
      0,
      0,
      destW,
      destH
    );
  }

  if (blobTrackingEnabled && blobValid && blobCanvas) {
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(
      blobCanvas,
      0,
      0,
      blobCanvas.width,
      blobCanvas.height,
      0,
      0,
      destW,
      destH
    );
  }

  if (
    grainIntensity >= 0.001 &&
    filmGrainCanvas &&
    filmGrainCanvas.width > 1 &&
    filmGrainCanvas.height > 1
  ) {
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = Math.min(1, grainIntensity * 5);
    ctx.drawImage(
      filmGrainCanvas,
      0,
      0,
      filmGrainCanvas.width,
      filmGrainCanvas.height,
      0,
      0,
      destW,
      destH
    );
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

/**
 * When kaleidoscope is active, prefer that canvas (it already mirrors the layer stack).
 * Body layer in Cards mode draws current-frame-only, so this stays free of flat ghosts.
 */
export function compositeCardFrame(options: CardCompositeOptions): boolean {
  const { dest, kaleidoscopeMode } = options;
  const ctx = dest.getContext("2d");
  if (!ctx || dest.width < 1 || dest.height < 1) return false;

  ctx.clearRect(0, 0, dest.width, dest.height);

  if (kaleidoscopeMode !== "none") {
    const kaleidoscopeCanvas = document.querySelector(
      ".kaleidoscope-canvas"
    ) as HTMLCanvasElement | undefined;
    if (
      kaleidoscopeCanvas &&
      kaleidoscopeCanvas.width > 1 &&
      kaleidoscopeCanvas.height > 1
    ) {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(
        kaleidoscopeCanvas,
        0,
        0,
        kaleidoscopeCanvas.width,
        kaleidoscopeCanvas.height,
        0,
        0,
        dest.width,
        dest.height
      );
      // Kaleidoscope samples raw/depth always; if silhouette-only, punch with body alpha
      if (!options.includeBackground) {
        const bodyCanvas = document.querySelector(
          "canvas.body-export-canvas"
        ) as HTMLCanvasElement | undefined;
        if (bodyCanvas && bodyCanvas.width > 1) {
          ctx.globalCompositeOperation = "destination-in";
          ctx.drawImage(
            bodyCanvas,
            0,
            0,
            bodyCanvas.width,
            bodyCanvas.height,
            0,
            0,
            dest.width,
            dest.height
          );
          ctx.globalCompositeOperation = "source-over";
        }
      }
      return true;
    }
  }

  drawLayersFlat(ctx, dest.width, dest.height, options);
  return true;
}
