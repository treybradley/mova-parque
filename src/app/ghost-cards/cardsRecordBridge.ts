/**
 * Stable source-sized 2D canvas for Cards MediaRecorder.
 * GhostCardDeck blits the presented WebGL frame here after each render and
 * calls requestFrame() so encode gets one sample per GL frame (no setSize thrash).
 */

type CaptureTrack = MediaStreamTrack & { requestFrame?: () => void };

let recordCanvas: HTMLCanvasElement | null = null;
let captureTrack: CaptureTrack | null = null;
let active = false;

export function beginCardsRecordTarget(
  width: number,
  height: number
): HTMLCanvasElement {
  const w = Math.max(2, Math.floor(width));
  const h = Math.max(2, Math.floor(height));
  if (!recordCanvas) {
    recordCanvas = document.createElement("canvas");
    recordCanvas.className = "ghost-cards-record-canvas";
  }
  if (recordCanvas.width !== w || recordCanvas.height !== h) {
    recordCanvas.width = w;
    recordCanvas.height = h;
  }
  active = true;
  return recordCanvas;
}

export function attachCardsRecordTrack(track: MediaStreamTrack | null): void {
  captureTrack = track as CaptureTrack | null;
}

export function endCardsRecordTarget(): void {
  active = false;
  captureTrack = null;
}

export function isCardsRecordingActive(): boolean {
  return active && !!recordCanvas;
}

/**
 * Stretch-blit GL frame into the record target (same aspect as letterboxed stage)
 * and push a frame into the capture stream when possible.
 */
export function blitAndPushCardsFrame(source: HTMLCanvasElement): void {
  if (!active || !recordCanvas) return;
  const ctx = recordCanvas.getContext("2d");
  if (!ctx) return;

  const destW = recordCanvas.width;
  const destH = recordCanvas.height;
  const srcW = source.width;
  const srcH = source.height;
  if (srcW < 2 || srcH < 2 || destW < 2 || destH < 2) return;

  // Same aspect (source-letterboxed stage) → fill destination
  ctx.drawImage(source, 0, 0, srcW, srcH, 0, 0, destW, destH);

  // captureStream(0) + requestFrame = one encoded frame per blit
  try {
    captureTrack?.requestFrame?.();
  } catch {
    // Older browsers without requestFrame still get frames via canvas dirtying
  }
}
