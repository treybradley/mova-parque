import type { MetricsSnapshot } from "@/utils/motionMetrics";
import type { Keypoint } from "@/utils/poseTracking";
import type { PoseOverlayDrawStyle } from "@/utils/drawPoseOverlay";

/**
 * Video source shape used by mova-parque App (upload or webcam).
 * Used by getRecordingDimensions and RecordingEngine.
 */
export interface VideoSourceForRecording {
  type: "webcam" | "upload";
  videoElement: HTMLVideoElement | null;
  objectUrl: string | null;
  metadata: {
    duration: number;
    width: number;
    height: number;
    fileName: string;
  } | null;
}

export interface RecordingDimensions {
  width: number;
  height: number;
}

export type ExportFrameRate = 30 | 60;

export type ExportQualityPreset = "standard" | "high" | "max";

/** Bits per second for each quality preset (for MediaRecorder). */
export const EXPORT_QUALITY_BITRATE: Record<ExportQualityPreset, number> = {
  standard: 2_500_000,   // ~2.5 Mbps
  high: 5_000_000,       // ~5 Mbps
  max: 8_500_000,        // ~8.5 Mbps
};

/** Snapshot of UI toggles at recording start; gates which layers are drawn in the export. */
export interface RecordingLayerToggles {
  bodySegmentationEnabled: boolean;
  motionAnalysisEnabled: boolean;
  blobTrackingEnabled: boolean;
  /** When false, recording uses the current-frame-only body canvas (no ghost trails). */
  showGhostTrails: boolean;
  /** When true, depth layer is drawn as base and raw video is skipped. */
  depthEnabled: boolean;
}

/** One pose+metrics sample at a video timestamp (upload playback). */
export interface PoseRecordingSample {
  videoTime: number;
  keypoints: Keypoint[];
  metrics: MetricsSnapshot;
}

/**
 * When set (non-kaleidoscope export only), pose is redrawn from interpolated samples
 * so export frame rate matches smooth motion; kaleidoscope still uses the composited canvas.
 */
export interface PoseExportForRecording {
  getVideoCurrentTime: () => number;
  getSamples: () => PoseRecordingSample[];
  style: PoseOverlayDrawStyle;
  confidenceThreshold: number;
}

export interface StartRecordingOptions {
  width: number;
  height: number;
  frameRate: ExportFrameRate;
  videoBitsPerSecond?: number;
  kaleidoscopeMode: "none" | "horizontal" | "vertical" | "radial";
  grainIntensity: number;
  /** When true, draw the raw video layer (between pose and blob) in the composite. */
  showRawVideo: boolean;
  /** Video element for the raw layer (upload or webcam). Required when showRawVideo is true. */
  rawVideoElement: HTMLVideoElement | null;
  /** Opacity of the raw video layer (0–1). Applied so body/pose layers show through. */
  rawVideoOpacity: number;
  /** Which layers to include in the composite; taken from UI at recording start. */
  layerToggles: RecordingLayerToggles;
  /** Atmosphere blend mode for body segmentation (matches BodySegmentationLayer CSS mix-blend-mode). */
  blendMode: string;
  /** Atmosphere haziness (0–1); affects body layer opacity when blend mode is active. */
  haziness: number;
  /** When true, draw a logo watermark (e.g. 20% opacity) on the export. Used for anonymous/free users. */
  applyWatermark: boolean;
  /** Interpolated pose overlay for upload exports when kaleidoscope is off. */
  poseExport?: PoseExportForRecording | null;
}

export interface RecordingResult {
  blob: Blob;
  /** File extension for download, e.g. "mp4" or "webm". */
  extension: string;
}

export interface RecordingEngineHandle {
  stop: () => Promise<RecordingResult>;
}
