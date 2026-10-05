import { motion } from "motion/react";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { CollapsibleSection } from "./ui/collapsible-section";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  ChevronLeft,
  Film,
  MoreVertical,
  Music,
  Sparkles,
  PanelLeftOpen,
  SwitchCamera,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "./ui/use-mobile";
import { ResponsiveInfoPopover } from "./ui/responsive-info-popover";
import { BlobTrackingConfig } from "@/utils/blobTracking";
import { VideoUpload } from "./VideoUpload";
import { RecordAndExport } from "./RecordAndExport";
import type { ExportQualityPreset } from "@/app/recording";
import type { CardsStyle, TrailView } from "@/app/ghost-cards/constants";
import {
  CARD_BORDER_PRESETS,
  CARDS_MAX_HISTORY,
} from "@/app/ghost-cards/constants";

interface ControlPanelProps {
  mood: {
    colorPalette: number;
    brightness: number;
  };
  movement: {
    trailLength: number;
  };
  atmosphere: {
    haziness: number;
    depth: number;
    blendMode: string;
    noise: number;
    grainSpeed: number;
  };
  background: {
    kaleidoscope: string;
  };
  bodyEffects: {
    ghostTrail: number;
    ghostFrames: number;
    ghostDecay: number;
    ghostSpeed: number;
    trailColorGradient: number;
    showGhostTrails: boolean;
  };
  camera: {
    enabled: boolean;
    showRawVideo: boolean;
    rawVideoOpacity: number;
  };
  blobTracking: BlobTrackingConfig;
  motionAnalysis: {
    enabled: boolean;
    showSkeleton: boolean;
    showMetrics: boolean;
    skeletonColor: string;
    skeletonLineWidth: number;
    jointSize: number;
    lineStyle: 'solid' | 'dashed';
    showJointAngles: boolean;
    showROM: boolean;
    enabledBones: boolean[];
    enabledJoints: boolean[];
    jointAngleTextSize: number;
    jointAngleTextColor: string;
    jointAngleBgColor: string;
    romTextSize: number;
    romTextColor: string;
    romBgColor: string;
    enabledMetricsJoints: {
      left_knee: boolean;
      right_knee: boolean;
      left_hip: boolean;
      right_hip: boolean;
      left_elbow: boolean;
      right_elbow: boolean;
    };
  };
  onMoodChange: (key: string, value: number) => void;
  onMovementChange: (key: string, value: number) => void;
  onAtmosphereChange: (key: string, value: number) => void;
  onAtmosphereBlendModeChange: (blendMode: string) => void;
  onBackgroundChange: (
    key: string,
    value: number | string,
  ) => void;
  onBodyEffectsChange: (key: string, value: number | boolean) => void;
  bodySegmentation: {
    enabled: boolean;
  };
  onBodySegmentationChange: (key: string, value: boolean) => void;
  onCameraChange: (key: string, value: boolean) => void;
  onCameraNumberChange: (key: string, value: number) => void;
  onBlobTrackingChange: (
    key: keyof BlobTrackingConfig,
    value: any,
  ) => void;
  depthAnything?: {
    enabled: boolean;
    style: "depthMap" | "heatmap" | "xray";
    intensity: number;
    depthRange: [number, number];
  };
  onDepthAnythingChange?: (key: string, value: unknown) => void;
  onMotionAnalysisChange: (key: string, value: any) => void;
  onOpenPitchDeck: () => void;
  videoSource: {
    type: "webcam" | "upload";
    metadata: {
      duration: number;
      width: number;
      height: number;
      fileName: string;
    } | null;
  };
  isVideoUploading: boolean;
  onVideoSelect: (file: File) => void;
  onClearVideo: () => void;
  onSwitchToWebcam: () => void;
  onSwitchCamera?: () => void;
  cameraStream: MediaStream | null;
  appMode?: 'mova-parque' | 'video-to-frames' | 'mova-score';
  onAppModeChange?: (mode: 'mova-parque' | 'video-to-frames' | 'mova-score') => void;
  isRecording?: boolean;
  recordingStartTime?: number | null;
  exportQualityPreset?: ExportQualityPreset;
  onExportQualityPresetChange?: (preset: ExportQualityPreset) => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  canUsePremiumExport?: boolean;
  onRequestSignIn?: () => void;
  trailView?: TrailView;
  onTrailViewChange?: (view: TrailView) => void;
  cardsIncludeBackground?: boolean;
  onCardsIncludeBackgroundChange?: (value: boolean) => void;
  cardsStyle?: CardsStyle;
  onCardsStyleChange?: <K extends keyof CardsStyle>(
    key: K,
    value: CardsStyle[K],
  ) => void;
  onCardsCameraReset?: () => void;
}

export function ControlPanel(props: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();

  // Tooltip content for Body & Trails
  const bodyTrailsTooltip = (
    <div className="space-y-2 text-white">
      <p className="font-semibold text-white text-xs mb-2">
        Body Trails Controls:
      </p>
      <div className="space-y-1.5 text-[10px] leading-relaxed">
        <p>
          <strong>Ghost Trail:</strong> Intensity of motion
          trail persistence behind the body
        </p>
        <p>
          <strong>Ghost Frames:</strong> Number of historical
          frames stored for trail effect
        </p>
        <p>
          <strong>Ghost Decay:</strong> How quickly trail frames
          fade over time
        </p>
        <p>
          <strong>Ghost Speed:</strong> Animation speed of the
          ghosting effect
        </p>
        <p>
          <strong>Live Tint:</strong> Color tinting applied to
          the live person
        </p>
        <p>
          <strong>Aura Size:</strong> Blur radius around the
          body silhouette
        </p>
        <p>
          <strong>Aura Intensity:</strong> Strength of the aura
          glow effect
        </p>
        <p>
          <strong>Color Grade:</strong> Color grading intensity
          applied to body segmentation
        </p>
      </div>
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: isOpen ? 0 : -400, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-full w-[320px] md:w-[400px] bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col z-50"
      >
        {/* Sticky header */}
        <div className="flex-shrink-0 sticky top-0 z-10 bg-black/40 backdrop-blur-xl border-b border-white/10 -mx-0 px-4 pt-4 md:px-8 md:pt-8 pb-4">
          <div className="space-y-2 relative">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-md font-thin tracking-wider text-white/60 uppercase">
                  Mova Parque
                </h1>
                <p className="text-xs text-white/40 leading-relaxed mt-0">
                  Realtime graphics tools driven by movement. For best results, please{" "}
                  <button
                    onClick={props.onOpenPitchDeck}
                    className="text-[12px] font-thin text-white/60 hover:text-white underline underline-offset-2 decoration-white/30 hover:decoration-white/60 transition-all"
                  >
                    read our usage guide.
                  </button>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* App Menu */}
                {props.appMode !== undefined && props.onAppModeChange && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all flex-shrink-0"
                        title="Apps & Settings"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-56 bg-black/90 backdrop-blur-xl border border-white/10"
                    >
                      <DropdownMenuLabel className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px]">
                        Apps
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => props.onAppModeChange?.('mova-parque')}
                        className={`text-white/70 focus:text-white focus:bg-white/10 ${
                          props.appMode === 'mova-parque' ? 'bg-white/5' : ''
                        }`}
                      >
                        <Sparkles className="size-4 mr-2" />
                        <span>Mova Parque</span>
                        {props.appMode === 'mova-parque' && (
                          <span className="ml-auto text-xs text-white/40">✓</span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => props.onAppModeChange?.('video-to-frames')}
                        className={`text-white/70 focus:text-white focus:bg-white/10 ${
                          props.appMode === 'video-to-frames' ? 'bg-white/5' : ''
                        }`}
                      >
                        <Film className="size-4 mr-2" />
                        <span>Video to Frames</span>
                        {props.appMode === 'video-to-frames' && (
                          <span className="ml-auto text-xs text-white/40">✓</span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => props.onAppModeChange?.('mova-score')}
                        className={`text-white/70 focus:text-white focus:bg-white/10 ${
                          props.appMode === 'mova-score' ? 'bg-white/5' : ''
                        }`}
                      >
                        <Music className="size-4 mr-2" />
                        <span>Motion Scores</span>
                        {props.appMode === 'mova-score' && (
                          <span className="ml-auto text-xs text-white/40">✓</span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuLabel className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px]">
                        Account
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => props.onRequestSignIn?.()}
                        className="text-white/70 focus:text-white focus:bg-white/10 cursor-pointer"
                      >
                        <span className="text-xs">
                          {props.canUsePremiumExport ? "Details" : "Sign in"}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {/* Close button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all flex-shrink-0"
                  title="Close panel"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto control-panel-scroll">
          <div className="p-4 md:p-8 space-y-5">
          {/* Body Segmentation - Always visible */}
          <div className="space-y-4">
            <Label className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px]">
              Upload or record video
            </Label>

            {/* Source Status Badge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Current Source:
                </span>
                <div className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-light bg-white/10 border border-white/20 text-white">
                  {props.videoSource.type === "upload" && props.videoSource.metadata
                    ? "Uploaded Video"
                    : props.cameraStream
                    ? "Webcam"
                    : "No Source"}
                </div>
              </div>
            </div>

            {/* Video Upload Component - Always visible */}
            <div className="space-y-2">
              <VideoUpload
                onVideoSelect={props.onVideoSelect}
                onClearVideo={props.onClearVideo}
                currentVideo={props.videoSource.metadata}
                isUploading={props.isVideoUploading}
              />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 text-center leading-relaxed mt-2">
                  or
                </p>
              </div>

            {/* Use Webcam Button - Toggle */}
            <div className="space-y-2">
              <button
                onClick={props.onSwitchToWebcam}
                className={`w-full px-3 py-2 rounded-lg text-xs font-light transition-all border ${
                  props.cameraStream
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 hover:border-white/20"
                }`}
              >
                {props.cameraStream ? "Turn Off Webcam" : "Use Webcam"}
              </button>
              {/* Switch camera (front/back) - mobile only, Mova Parque only, when webcam is on */}
              {props.appMode === "mova-parque" &&
                isMobile &&
                props.cameraStream &&
                props.onSwitchCamera && (
                  <button
                    type="button"
                    onClick={props.onSwitchCamera}
                    className="w-full px-3 py-2 rounded-lg text-xs font-light transition-all border bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 hover:border-white/20 flex items-center justify-center gap-2"
                  >
                    <SwitchCamera className="size-3.5" />
                    Switch camera
                  </button>
                )}
            </div>

            {/* Show Raw Video - Only visible when source is available */}
            {((props.videoSource.type === "upload" && props.videoSource.metadata) || props.cameraStream) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-white/70 font-light">
                    Original Video Background
                  </span>
                  <Switch
                    checked={props.camera.showRawVideo}
                    onCheckedChange={(value) =>
                      props.onCameraChange(
                        "showRawVideo",
                        value,
                      )
                    }
                  />
                </div>
              </div>
            )}

          </div>

          {/* Visual Separator */}
          <div className="border-t border-white/10"></div>


          {/* ========== SECTION 3: BODY & TRAILS ========== */}
          <CollapsibleSection
            title="Body Trails"
            defaultOpen={false}
          >
            {/* Section description and info button */}
            <div className="pb-0 space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Control the look/feel of the body trails.
              </p>
              <ResponsiveInfoPopover
                content={bodyTrailsTooltip}
              />
            </div>

            {/* Body Segmentation Toggle (controls dependent trail settings below) */}
            <div className="flex items-center justify-between pt-0">
              <span className="text-[12px] text-white/70 font-light">
                Body Segmentation
              </span>
              <Switch
                checked={props.bodySegmentation.enabled}
                onCheckedChange={(value) =>
                  props.onBodySegmentationChange("enabled", value)
                }
              />
            </div>

            {props.bodySegmentation.enabled && (
              <>
                {/* Trail view: Flat composite vs 3D card deck */}
                <div className="space-y-2 pt-0">
                  <span className="text-[12px] text-white/70 font-light">
                    Trail View
                  </span>
                  <div className="flex gap-1">
                    {(["flat", "cards"] as TrailView[]).map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => props.onTrailViewChange?.(view)}
                        className={`flex-1 rounded px-2 py-1.5 text-[11px] font-light capitalize transition-colors ${
                          (props.trailView ?? "flat") === view
                            ? "bg-white/15 text-white"
                            : "bg-white/5 text-white/50 hover:bg-white/10"
                        }`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>

                {(props.trailView ?? "flat") === "cards" && (
                  <div className="space-y-3 pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/70 font-light">
                        Cards Include Background
                      </span>
                      <Switch
                        checked={props.cardsIncludeBackground ?? true}
                        onCheckedChange={(value) =>
                          props.onCardsIncludeBackgroundChange?.(value)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/70 font-light">
                        Glass Cards
                      </span>
                      <Switch
                        checked={props.cardsStyle?.glass ?? true}
                        onCheckedChange={(value) =>
                          props.onCardsStyleChange?.("glass", value)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/70 font-light">
                        Reflective Floor
                      </span>
                      <Switch
                        checked={props.cardsStyle?.showFloor ?? true}
                        onCheckedChange={(value) =>
                          props.onCardsStyleChange?.("showFloor", value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white/70 font-light">
                          Card Border
                        </span>
                        <span className="text-xs text-white/50 font-light">
                          {Math.round((props.cardsStyle?.borderWidth ?? 0) * 1000)}
                        </span>
                      </div>
                      <Slider
                        value={[props.cardsStyle?.borderWidth ?? 0.02]}
                        onValueChange={(value) =>
                          props.onCardsStyleChange?.("borderWidth", value[0])
                        }
                        min={0}
                        max={0.06}
                        step={0.002}
                        className="slider-custom"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="text-[12px] text-white/70 font-light">
                        Border Color
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CARD_BORDER_PRESETS.map((preset) => {
                          const active =
                            (props.cardsStyle?.borderColor ?? "").toLowerCase() ===
                            preset.color.toLowerCase();
                          return (
                            <button
                              key={preset.color}
                              type="button"
                              title={preset.label}
                              onClick={() =>
                                props.onCardsStyleChange?.(
                                  "borderColor",
                                  preset.color,
                                )
                              }
                              className={`h-6 w-6 rounded-full border transition-transform ${
                                active
                                  ? "scale-110 border-white"
                                  : "border-white/25 hover:border-white/60"
                              }`}
                              style={{ backgroundColor: preset.color }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white/70 font-light">
                          Border Opacity
                        </span>
                        <span className="text-xs text-white/50 font-light">
                          {Math.round(
                            (props.cardsStyle?.borderOpacity ?? 0.45) * 100,
                          )}
                        </span>
                      </div>
                      <Slider
                        value={[props.cardsStyle?.borderOpacity ?? 0.45]}
                        onValueChange={(value) =>
                          props.onCardsStyleChange?.(
                            "borderOpacity",
                            value[0],
                          )
                        }
                        min={0}
                        max={1}
                        step={0.01}
                        className="slider-custom"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => props.onCardsCameraReset?.()}
                      className="w-full rounded px-2 py-1.5 text-[11px] font-light bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Reset Camera
                    </button>
                    <p className="text-[10px] text-white/35 font-light leading-relaxed">
                      Scroll to zoom · drag to orbit. Export keeps source aspect
                      (e.g. 9:16).
                    </p>
                  </div>
                )}

                {/* Show Ghost Trails Toggle */}
                <div className="flex items-center justify-between pt-0">
                  <span className="text-[12px] text-white/70 font-light">
                    Show Ghost Trails
                  </span>
                  <Switch
                    checked={props.bodyEffects.showGhostTrails}
                    onCheckedChange={(value) =>
                      props.onBodyEffectsChange("showGhostTrails", value)
                    }
                  />
                </div>

                {/* Ghost Trail */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/70 font-light">
                      Ghost Trail
                    </span>
                    <span className="text-xs text-white/50 font-light">
                      {Math.round(
                        props.bodyEffects.ghostTrail * 100,
                      )}
                    </span>
                  </div>
                  <Slider
                    value={[props.bodyEffects.ghostTrail]}
                    onValueChange={(value) =>
                      props.onBodyEffectsChange(
                        "ghostTrail",
                        value[0],
                      )
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    className="slider-custom"
                  />
                </div>

                {/* Ghost Frames */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/70 font-light">
                      Ghost Frames
                    </span>
                    <span className="text-xs text-white/50 font-light">
                      {Math.round(props.bodyEffects.ghostFrames)}
                    </span>
                  </div>
                  <Slider
                    value={[props.bodyEffects.ghostFrames]}
                    onValueChange={(value) =>
                      props.onBodyEffectsChange(
                        "ghostFrames",
                        value[0],
                      )
                    }
                    min={3}
                    max={
                      (props.trailView ?? "flat") === "cards"
                        ? CARDS_MAX_HISTORY
                        : 90
                    }
                    step={1}
                    className="slider-custom"
                  />
                </div>

                {/* Ghost Decay */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/70 font-light">
                      Ghost Decay
                    </span>
                    <span className="text-xs text-white/50 font-light">
                      {Math.round(
                        props.bodyEffects.ghostDecay * 100,
                      )}
                    </span>
                  </div>
                  <Slider
                    value={[props.bodyEffects.ghostDecay]}
                    onValueChange={(value) =>
                      props.onBodyEffectsChange(
                        "ghostDecay",
                        value[0],
                      )
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    className="slider-custom"
                  />
                </div>

                {/* Ghost Speed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/70 font-light">
                      Ghost Speed
                    </span>
                    <span className="text-xs text-white/50 font-light">
                      {Math.round(
                        props.bodyEffects.ghostSpeed * 100,
                      )}
                    </span>
                  </div>
                  <Slider
                    value={[props.bodyEffects.ghostSpeed]}
                    onValueChange={(value) =>
                      props.onBodyEffectsChange(
                        "ghostSpeed",
                        value[0],
                      )
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    className="slider-custom"
                  />
                </div>
              </>
            )}

          </CollapsibleSection>

          {/* Visual Separator */}
          <div className="border-t border-white/10"></div>
          
          {/* ========== MOTION ANALYSIS ========== */}
          <CollapsibleSection
            title="Motion Analysis"
            defaultOpen={false}
          >
            <div className="space-y-4">
              {/* Webcam warning */}
              {props.cameraStream && (
                <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-200">
                    Motion Analysis is not available for webcam streams. Please upload a video file to use this feature.
                  </p>
                </div>
              )}
              
              {/* Enable Motion Analysis */}
              <div className="flex items-center justify-between">
                <Label className="text-[12px] text-white/70 font-light">
                  Enable Motion Analysis
                </Label>
                <Switch
                  checked={props.motionAnalysis.enabled}
                  disabled={!!props.cameraStream}
                  onCheckedChange={(value) => props.onMotionAnalysisChange("enabled", value)}
                />
              </div>
              
              {props.motionAnalysis.enabled && (
                <>
                  {/* Show Skeleton */}
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] text-white/70 font-light">
                      Show Skeleton
                    </Label>
                    <Switch
                      checked={props.motionAnalysis.showSkeleton}
                      disabled={!!props.cameraStream}
                      onCheckedChange={(value) => props.onMotionAnalysisChange("showSkeleton", value)}
                    />
                  </div>

                  {/* Skeleton Customization */}
                  {props.motionAnalysis.showSkeleton && (
                    <div className="pt-0 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[12px] text-white/70 font-light">
                          Skeleton Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={props.motionAnalysis.skeletonColor}
                            onChange={(e) => props.onMotionAnalysisChange("skeletonColor", e.target.value)}
                            disabled={!!props.cameraStream}
                            className="w-12 h-8 rounded border border-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <input
                            type="text"
                            value={props.motionAnalysis.skeletonColor}
                            onChange={(e) => props.onMotionAnalysisChange("skeletonColor", e.target.value)}
                            disabled={!!props.cameraStream}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="#00ff00"
                          />
                        </div>
                      </div>

                      {/* Line Width */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[12px] text-white/70 font-light">
                            Line Width
                          </Label>
                          <span className="text-xs text-white/50 font-light">
                            {props.motionAnalysis.skeletonLineWidth}
                          </span>
                        </div>
                        <Slider
                          value={[props.motionAnalysis.skeletonLineWidth]}
                          onValueChange={(value) => props.onMotionAnalysisChange("skeletonLineWidth", value[0])}
                          disabled={!!props.cameraStream}
                          min={1}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* Joint Size */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[12px] text-white/70 font-light">
                            Joint Size
                          </Label>
                          <span className="text-xs text-white/50 font-light">
                            {props.motionAnalysis.jointSize}
                          </span>
                        </div>
                        <Slider
                          value={[props.motionAnalysis.jointSize]}
                          onValueChange={(value) => props.onMotionAnalysisChange("jointSize", value[0])}
                          disabled={!!props.cameraStream}
                          min={2}
                          max={16}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* Line Style */}
                      <div className="space-y-2">
                        <Label className="text-[12px] text-white/70 font-light">
                          Line Style
                        </Label>
                        <select
                          value={props.motionAnalysis.lineStyle}
                          onChange={(e) => props.onMotionAnalysisChange("lineStyle", e.target.value)}
                          disabled={!!props.cameraStream}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Show Joint Angles */}
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] text-white/70 font-light">
                      Show Joint Angles on Skeleton
                    </Label>
                    <Switch
                      checked={props.motionAnalysis.showJointAngles}
                      disabled={!!props.cameraStream}
                      onCheckedChange={(value) => props.onMotionAnalysisChange("showJointAngles", value)}
                    />
                  </div>

                  {/* Show ROM */}
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] text-white/70 font-light">
                      Show ROM on Skeleton
                    </Label>
                    <Switch
                      checked={props.motionAnalysis.showROM}
                      disabled={!!props.cameraStream}
                      onCheckedChange={(value) => props.onMotionAnalysisChange("showROM", value)}
                    />
                  </div>

                  {/* Joint Angle Text Styling */}
                  {props.motionAnalysis.showJointAngles && (
                    <div className="pt-4 border-t border-white/10 space-y-4">
                      <div className="text-xs text-white/50 font-light uppercase">
                        Joint Angle Text
                      </div>

                      {/* Joint Angle Text Size */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[12px] text-white/70 font-light">
                            Text Size
                          </Label>
                          <span className="text-xs text-white/50 font-light">
                            {props.motionAnalysis.jointAngleTextSize}px
                          </span>
                        </div>
                        <Slider
                          value={[props.motionAnalysis.jointAngleTextSize]}
                          onValueChange={(value) => props.onMotionAnalysisChange("jointAngleTextSize", value[0])}
                          min={8}
                          max={24}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* Joint Angle Text Color */}
                      <div className="space-y-2">
                        <Label className="text-[12px] text-white/70 font-light">
                          Text Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={props.motionAnalysis.jointAngleTextColor}
                            onChange={(e) => props.onMotionAnalysisChange("jointAngleTextColor", e.target.value)}
                            className="w-12 h-8 rounded border border-white/10 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={props.motionAnalysis.jointAngleTextColor}
                            onChange={(e) => props.onMotionAnalysisChange("jointAngleTextColor", e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30"
                            placeholder="#00ff00"
                          />
                        </div>
                      </div>

                      {/* Joint Angle Background Color */}
                      <div className="space-y-2">
                        <Label className="text-[12px] text-white/70 font-light">
                          Background Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={props.motionAnalysis.jointAngleBgColor}
                            onChange={(e) => props.onMotionAnalysisChange("jointAngleBgColor", e.target.value)}
                            className="w-12 h-8 rounded border border-white/10 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={props.motionAnalysis.jointAngleBgColor}
                            onChange={(e) => props.onMotionAnalysisChange("jointAngleBgColor", e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ROM Text Styling */}
                  {props.motionAnalysis.showROM && (
                    <div className="pt-4 border-t border-white/10 space-y-4">
                      <div className="text-xs text-white/50 font-light uppercase">
                        ROM Text
                      </div>

                      {/* ROM Text Size */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[12px] text-white/70 font-light">
                            Text Size
                          </Label>
                          <span className="text-xs text-white/50 font-light">
                            {props.motionAnalysis.romTextSize}px
                          </span>
                        </div>
                        <Slider
                          value={[props.motionAnalysis.romTextSize]}
                          onValueChange={(value) => props.onMotionAnalysisChange("romTextSize", value[0])}
                          min={8}
                          max={24}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* ROM Text Color */}
                      <div className="space-y-2">
                        <Label className="text-[12px] text-white/70 font-light">
                          Text Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={props.motionAnalysis.romTextColor}
                            onChange={(e) => props.onMotionAnalysisChange("romTextColor", e.target.value)}
                            className="w-12 h-8 rounded border border-white/10 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={props.motionAnalysis.romTextColor}
                            onChange={(e) => props.onMotionAnalysisChange("romTextColor", e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30"
                            placeholder="#00ff00"
                          />
                        </div>
                      </div>

                      {/* ROM Background Color */}
                      <div className="space-y-2">
                        <Label className="text-[12px] text-white/70 font-light">
                          Background Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={props.motionAnalysis.romBgColor}
                            onChange={(e) => props.onMotionAnalysisChange("romBgColor", e.target.value)}
                            className="w-12 h-8 rounded border border-white/10 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={props.motionAnalysis.romBgColor}
                            onChange={(e) => props.onMotionAnalysisChange("romBgColor", e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CollapsibleSection>
                    
          {/* Visual Separator */}
          <div className="border-t border-white/10"></div>

          {/* ========== SECTION 3: TRIPPY SECTION ========== */}
          <CollapsibleSection
            title="More Visual Processing"
            defaultOpen={false}
          >
            {/* Kaleidoscope */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Kaleidoscope
                </span>
                <span className="text-xs text-white/50 font-light capitalize">
                  {props.background.kaleidoscope}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "none",
                  "horizontal",
                  "vertical",
                  "radial",
                ].map((mode) => (
                  <button
                    key={mode}
                    onClick={() =>
                      props.onBackgroundChange(
                        "kaleidoscope",
                        mode,
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-light transition-all ${
                      props.background.kaleidoscope === mode
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() +
                      mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10"></div>

            {/* Depth Anything - Nested Collapsible */}
            {props.depthAnything !== undefined && props.onDepthAnythingChange && (() => {
              const depth = props.depthAnything!;
              return (
              <div className="pt-2">
                <CollapsibleSection
                  title="Depth Anything"
                  defaultOpen={false}
                >
                  <div className="space-y-4 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/70 font-light">
                        Enable Depth
                      </span>
                      <Switch
                        checked={depth.enabled}
                        onCheckedChange={(value) =>
                          props.onDepthAnythingChange?.("enabled", value)
                        }
                      />
                    </div>
                    {depth.enabled && (
                      <>
                        <div className="space-y-2">
                          <span className="text-[12px] text-white/70 font-light block">
                            Style
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            {(
                              [
                                ["depthMap", "Depth Map"],
                                ["heatmap", "Heatmap"],
                                ["xray", "X-Ray"],
                              ] as const
                            ).map(([mode, label]) => (
                              <button
                                key={mode}
                                onClick={() =>
                                  props.onDepthAnythingChange?.("style", mode)
                                }
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-light transition-all ${
                                  depth.style === mode
                                    ? "bg-white/20 text-white border border-white/30"
                                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[12px] text-white/70 font-light block">
                            Depth range
                          </span>
                          <div className="flex justify-between text-[10px] text-white/50">
                            <span>Near: {depth.depthRange[0].toFixed(2)}</span>
                            <span>Far: {depth.depthRange[1].toFixed(2)}</span>
                          </div>
                          <Slider
                            value={depth.depthRange}
                            onValueChange={([min, max]) =>
                              props.onDepthAnythingChange?.("depthRange", [min, max])
                            }
                            min={0}
                            max={1}
                            step={0.01}
                            minStepsBetweenThumbs={0.1}
                            className="slider-custom"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleSection>
              </div>
              );
            })()}
            
            {/* Visual Separator */}
            <div className="border-t border-white/10"></div>

            {/* Blob Tracking - Nested Collapsible */}
            <div className="pt-2">
              <CollapsibleSection
                title="Blob Tracking"
                defaultOpen={false}
              >
                {/* Master Enable */}
                <div className="space-y-2 pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/70 font-light">
                      Enable Blob Tracking
                    </span>
                    <Switch
                      checked={props.blobTracking.enabled}
                      onCheckedChange={(value) =>
                        props.onBlobTrackingChange(
                          "enabled",
                          value,
                        )
                      }
                    />
                  </div>
                </div>

                {props.blobTracking.enabled && (
                  <div className="space-y-4 pt-4">
                    {/* Detection Settings */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60 font-light uppercase tracking-wider">
                          Detection
                        </span>
                      </div>

                      {/* Threshold */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70 font-light">
                            Threshold
                          </span>
                          <span className="text-xs text-white/50 font-light">
                            {props.blobTracking.threshold}
                          </span>
                        </div>
                        <Slider
                          value={[props.blobTracking.threshold]}
                          onValueChange={(value) =>
                            props.onBlobTrackingChange(
                              "threshold",
                              value[0],
                            )
                          }
                          min={0}
                          max={255}
                          step={1}
                          className="slider-custom"
                        />
                      </div>

                      {/* Detection Mode */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70 font-light">
                            Detection Mode
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            className={`px-3 py-2 text-xs font-light rounded transition-all ${
                              props.blobTracking.detectionMode ===
                              "bright"
                                ? "bg-white/20 text-white"
                                : "bg-white/5 text-white/50 hover:bg-white/10"
                            }`}
                            onClick={() =>
                              props.onBlobTrackingChange(
                                "detectionMode",
                                "bright",
                              )
                            }
                          >
                            Bright
                          </button>
                          <button
                            className={`px-3 py-2 text-xs font-light rounded transition-all ${
                              props.blobTracking.detectionMode ===
                              "dark"
                                ? "bg-white/20 text-white"
                                : "bg-white/5 text-white/50 hover:bg-white/10"
                            }`}
                            onClick={() =>
                              props.onBlobTrackingChange(
                                "detectionMode",
                                "dark",
                              )
                            }
                          >
                            Dark
                          </button>
                          <button
                            className={`px-3 py-2 text-xs font-light rounded transition-all ${
                              props.blobTracking.detectionMode ===
                              "edge"
                                ? "bg-white/20 text-white"
                                : "bg-white/5 text-white/50 hover:bg-white/10"
                            }`}
                            onClick={() =>
                              props.onBlobTrackingChange(
                                "detectionMode",
                                "edge",
                              )
                            }
                          >
                            Edge
                          </button>
                        </div>
                      </div>

                      {/* Min Blob Size */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70 font-light">
                            Min Blob Size
                          </span>
                          <span className="text-xs text-white/50 font-light">
                            {props.blobTracking.minBlobSize}
                          </span>
                        </div>
                        <Slider
                          value={[props.blobTracking.minBlobSize]}
                          onValueChange={(value) =>
                            props.onBlobTrackingChange(
                              "minBlobSize",
                              value[0],
                            )
                          }
                          min={10}
                          max={500}
                          step={5}
                          className="slider-custom"
                        />
                      </div>

                      {/* Max Blob Size */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70 font-light">
                            Max Blob Size
                          </span>
                          <span className="text-xs text-white/50 font-light">
                            {props.blobTracking.maxBlobSize}
                          </span>
                        </div>
                        <Slider
                          value={[props.blobTracking.maxBlobSize]}
                          onValueChange={(value) =>
                            props.onBlobTrackingChange(
                              "maxBlobSize",
                              value[0],
                            )
                          }
                          min={100}
                          max={50000}
                          step={100}
                          className="slider-custom"
                        />
                      </div>

                      {/* Detection Interval */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70 font-light">
                            Detection Interval
                          </span>
                          <span className="text-xs text-white/50 font-light">
                            {props.blobTracking.detectionInterval}{" "}
                            frames
                          </span>
                        </div>
                        <Slider
                          value={[
                            props.blobTracking.detectionInterval,
                          ]}
                          onValueChange={(value) =>
                            props.onBlobTrackingChange(
                              "detectionInterval",
                              value[0],
                            )
                          }
                          min={1}
                          max={30}
                          step={1}
                          className="slider-custom"
                        />
                      </div>

                      {/* Smoothing */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70 font-light">
                            Smoothing
                          </span>
                          <span className="text-xs text-white/50 font-light">
                            {props.blobTracking.smoothing.toFixed(
                              3,
                            )}
                          </span>
                        </div>
                        <Slider
                          value={[props.blobTracking.smoothing]}
                          onValueChange={(value) =>
                            props.onBlobTrackingChange(
                              "smoothing",
                              value[0],
                            )
                          }
                          min={0}
                          max={0.999}
                          step={0.001}
                          className="slider-custom"
                        />
                      </div>
                    </div>

                    {/* Bounding Boxes */}
                    <div className="space-y-2 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60 font-light uppercase tracking-wider">
                          Bounding Boxes
                        </span>
                        <Switch
                          checked={
                            props.blobTracking.showBoundingBoxes
                          }
                          onCheckedChange={(value) =>
                            props.onBlobTrackingChange(
                              "showBoundingBoxes",
                              value,
                            )
                          }
                        />
                      </div>

                      {props.blobTracking.showBoundingBoxes && (
                        <>
                          {/* Shape */}
                          <div className="space-y-2">
                            <span className="text-xs text-white/70 font-light">
                              Shape
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {["square", "circle"].map(
                                (shape) => (
                                  <button
                                    key={shape}
                                    onClick={() =>
                                      props.onBlobTrackingChange(
                                        "boundingBoxShape",
                                        shape,
                                      )
                                    }
                                    className={`px-3 py-2 rounded-lg text-xs font-light transition-all ${
                                      props.blobTracking
                                        .boundingBoxShape ===
                                      shape
                                        ? "bg-white/20 text-white border border-white/30"
                                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                                    }`}
                                  >
                                    {shape
                                      .charAt(0)
                                      .toUpperCase() +
                                      shape.slice(1)}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>

                          {/* Style */}
                          <div className="space-y-2">
                            <span className="text-xs text-white/70 font-light">
                              Style
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                "frame",
                                "l-frame",
                                "x-frame",
                                "grid",
                                "scope",
                              ].map((style) => (
                                <button
                                  key={style}
                                  onClick={() =>
                                    props.onBlobTrackingChange(
                                      "boundingBoxRegionStyle",
                                      style,
                                    )
                                  }
                                  className={`px-2 py-2 rounded-lg text-xs font-light transition-all ${
                                    props.blobTracking
                                      .boundingBoxRegionStyle ===
                                    style
                                      ? "bg-white/20 text-white border border-white/30"
                                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                                  }`}
                                >
                                  {style
                                    .split("-")
                                    .map(
                                      (w) =>
                                        w
                                          .charAt(0)
                                          .toUpperCase() +
                                        w.slice(1),
                                    )
                                    .join("-")}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Size */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/70 font-light">
                                Size
                              </span>
                              <span className="text-xs text-white/50 font-light">
                                {props.blobTracking.boundingBoxSize.toFixed(
                                  2,
                                )}
                              </span>
                            </div>
                            <Slider
                              value={[
                                props.blobTracking
                                  .boundingBoxSize,
                              ]}
                              onValueChange={(value) =>
                                props.onBlobTrackingChange(
                                  "boundingBoxSize",
                                  value[0],
                                )
                              }
                              min={0.05}
                              max={3.0}
                              step={0.05}
                              className="slider-custom"
                            />
                          </div>

                          {/* Line Width */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/70 font-light">
                                Line Width
                              </span>
                              <span className="text-xs text-white/50 font-light">
                                {
                                  props.blobTracking
                                    .boundingBoxLineWidth
                                }
                              </span>
                            </div>
                            <Slider
                              value={[
                                props.blobTracking
                                  .boundingBoxLineWidth,
                              ]}
                              onValueChange={(value) =>
                                props.onBlobTrackingChange(
                                  "boundingBoxLineWidth",
                                  value[0],
                                )
                              }
                              min={1}
                              max={10}
                              step={1}
                              className="slider-custom"
                            />
                          </div>

                          {/* Color */}
                          <div className="space-y-2">
                            <span className="text-xs text-white/70 font-light">
                              Color
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={
                                  props.blobTracking
                                    .boundingBoxColor
                                }
                                onChange={(e) =>
                                  props.onBlobTrackingChange(
                                    "boundingBoxColor",
                                    e.target.value,
                                  )
                                }
                                className="w-12 h-8 rounded border border-white/10 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={props.blobTracking.boundingBoxColor}
                                onChange={(e) =>
                                  props.onBlobTrackingChange(
                                    "boundingBoxColor",
                                    e.target.value,
                                  )
                                }
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30"
                                placeholder="#00ff00"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Centroids */}
                    <div className="space-y-2 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60 font-light uppercase tracking-wider">
                          Centroids
                        </span>
                        <Switch
                          checked={
                            props.blobTracking.showCentroids
                          }
                          onCheckedChange={(value) =>
                            props.onBlobTrackingChange(
                              "showCentroids",
                              value,
                            )
                          }
                        />
                      </div>

                      {props.blobTracking.showCentroids && (
                        <>
                          {/* Size */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/70 font-light">
                                Size
                              </span>
                              <span className="text-xs text-white/50 font-light">
                                {props.blobTracking.centroidSize}
                              </span>
                            </div>
                            <Slider
                              value={[
                                props.blobTracking.centroidSize,
                              ]}
                              onValueChange={(value) =>
                                props.onBlobTrackingChange(
                                  "centroidSize",
                                  value[0],
                                )
                              }
                              min={2}
                              max={15}
                              step={1}
                              className="slider-custom"
                            />
                          </div>

                          {/* Color */}
                          <div className="space-y-2">
                            <span className="text-xs text-white/70 font-light">
                              Color
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={
                                  props.blobTracking.centroidColor
                                }
                                onChange={(e) =>
                                  props.onBlobTrackingChange(
                                    "centroidColor",
                                    e.target.value,
                                  )
                                }
                                className="w-12 h-8 rounded border border-white/10 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={props.blobTracking.centroidColor}
                                onChange={(e) =>
                                  props.onBlobTrackingChange(
                                    "centroidColor",
                                    e.target.value,
                                  )
                                }
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30"
                                placeholder="#00ff00"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Connections */}
                    <div className="space-y-2 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60 font-light uppercase tracking-wider">
                          Connections
                        </span>
                        <Switch
                          checked={
                            props.blobTracking.showConnections
                          }
                          onCheckedChange={(value) =>
                            props.onBlobTrackingChange(
                              "showConnections",
                              value,
                            )
                          }
                        />
                      </div>

                      {props.blobTracking.showConnections && (
                        <>
                          {/* Style */}
                          <div className="space-y-2">
                            <span className="text-xs text-white/70 font-light">
                              Style
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {["solid", "dashed"].map(
                                (style) => (
                                  <button
                                    key={style}
                                    onClick={() =>
                                      props.onBlobTrackingChange(
                                        "connectionStyle",
                                        style,
                                      )
                                    }
                                    className={`px-3 py-2 rounded-lg text-xs font-light transition-all ${
                                      props.blobTracking
                                        .connectionStyle === style
                                        ? "bg-white/20 text-white border border-white/30"
                                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                                    }`}
                                  >
                                    {style
                                      .charAt(0)
                                      .toUpperCase() +
                                      style.slice(1)}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>

                          {/* Line Width */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/70 font-light">
                                Line Width
                              </span>
                              <span className="text-xs text-white/50 font-light">
                                {
                                  props.blobTracking
                                    .connectionLineWidth
                                }
                              </span>
                            </div>
                            <Slider
                              value={[
                                props.blobTracking
                                  .connectionLineWidth,
                              ]}
                              onValueChange={(value) =>
                                props.onBlobTrackingChange(
                                  "connectionLineWidth",
                                  value[0],
                                )
                              }
                              min={0.5}
                              max={10}
                              step={0.5}
                              className="slider-custom"
                            />
                          </div>

                          {/* Color */}
                          <div className="space-y-2">
                            <span className="text-xs text-white/70 font-light">
                              Color
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={
                                  props.blobTracking.connectionColor
                                }
                                onChange={(e) =>
                                  props.onBlobTrackingChange(
                                    "connectionColor",
                                    e.target.value,
                                  )
                                }
                                className="w-12 h-8 rounded border border-white/10 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={props.blobTracking.connectionColor}
                                onChange={(e) =>
                                  props.onBlobTrackingChange(
                                    "connectionColor",
                                    e.target.value,
                                  )
                                }
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30"
                                placeholder="#00ff00"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Text Labels */}
                    <div className="space-y-2 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60 font-light uppercase tracking-wider">
                          Text Labels
                        </span>
                        <Switch
                          checked={props.blobTracking.showText}
                          onCheckedChange={(value) =>
                            props.onBlobTrackingChange(
                              "showText",
                              value,
                            )
                          }
                        />
                      </div>

                      {props.blobTracking.showText && (
                        <>
                          {/* Type */}
                          <div className="space-y-2">
                            <span className="text-xs text-white/70 font-light">
                              Type
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {["position", "count"].map(
                                (type) => (
                                  <button
                                    key={type}
                                    onClick={() =>
                                      props.onBlobTrackingChange(
                                        "textType",
                                        type,
                                      )
                                    }
                                    className={`px-3 py-2 rounded-lg text-xs font-light transition-all ${
                                      props.blobTracking
                                        .textType === type
                                        ? "bg-white/20 text-white border border-white/30"
                                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                                    }`}
                                  >
                                    {type
                                      .charAt(0)
                                      .toUpperCase() +
                                      type.slice(1)}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>

                          {/* Font Size */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/70 font-light">
                                Font Size
                              </span>
                              <span className="text-xs text-white/50 font-light">
                                {props.blobTracking.textFontSize}
                              </span>
                            </div>
                            <Slider
                              value={[
                                props.blobTracking.textFontSize,
                              ]}
                              onValueChange={(value) =>
                                props.onBlobTrackingChange(
                                  "textFontSize",
                                  value[0],
                                )
                              }
                              min={8}
                              max={24}
                              step={1}
                              className="slider-custom"
                            />
                          </div>

                          {/* Color */}
                          <div className="space-y-2">
                            <span className="text-xs text-white/70 font-light">
                              Color
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={props.blobTracking.textColor}
                                onChange={(e) =>
                                  props.onBlobTrackingChange(
                                    "textColor",
                                    e.target.value,
                                  )
                                }
                                className="w-12 h-8 rounded border border-white/10 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={props.blobTracking.textColor}
                                onChange={(e) =>
                                  props.onBlobTrackingChange(
                                    "textColor",
                                    e.target.value,
                                  )
                                }
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-light focus:outline-none focus:border-white/30"
                                placeholder="#00ff00"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            </div>

            {/* Visual Separator */}
            <div className="border-t border-white/10"></div>

            {/* Post Processing - Nested Collapsible */}
            <div className="pt-2">
              <CollapsibleSection
                title="Post Processing"
                defaultOpen={false}
              >
            {/* Film Grain Intensity */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Film Grain
                </span>
                <span className="text-xs text-white/50 font-light">
                  {(props.atmosphere.noise * 1000).toFixed(0)}
                </span>
              </div>
              <Slider
                value={[props.atmosphere.noise]}
                onValueChange={(value) =>
                  props.onAtmosphereChange("noise", value[0])
                }
                min={0}
                max={0.1}
                step={0.001}
                className="slider-custom"
              />
            </div>

            {/* Grain Speed */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Grain Speed
                </span>
                <span className="text-xs text-white/50 font-light">
                  {props.atmosphere.grainSpeed}
                </span>
              </div>
              <Slider
                value={[props.atmosphere.grainSpeed]}
                onValueChange={(value) =>
                  props.onAtmosphereChange(
                    "grainSpeed",
                    value[0],
                  )
                }
                min={1}
                max={10}
                step={1}
                className="slider-custom"
              />
            </div>

            {/* Blend Mode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Blend Mode
                </span>
                <span className="text-xs text-white/50 font-light capitalize">
                  {props.atmosphere.blendMode}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "normal",
                  "multiply",
                  "screen",
                  "overlay",
                  "soft-light",
                  "color-dodge",
                ].map((mode) => (
                  <button
                    key={mode}
                    onClick={() =>
                      props.onAtmosphereBlendModeChange(mode)
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-light transition-all ${
                      props.atmosphere.blendMode === mode
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                    }`}
                  >
                    {mode
                      .split("-")
                      .map(
                        (word) =>
                          word.charAt(0).toUpperCase() +
                          word.slice(1),
                      )
                      .join(" ")}
                  </button>
                ))}
              </div>
            </div>
              </CollapsibleSection>
            </div>

          </CollapsibleSection>
          </div>
        </div>
        {props.appMode === "mova-parque" &&
          props.onStartRecording != null &&
          props.onStopRecording != null && (
            <div className="flex-shrink-0 border-t border-white/10 p-6 bg-[#181a1a]">
              <CollapsibleSection title="Record & Export" defaultOpen={false}>
                <RecordAndExport
                  hasVideoSource={
                    (props.videoSource.type === "upload" && props.videoSource.metadata != null) ||
                    props.cameraStream != null
                  }
                  isRecording={props.isRecording ?? false}
                  recordingStartTime={props.recordingStartTime ?? null}
                  exportQualityPreset={props.exportQualityPreset ?? "standard"}
                  onExportQualityPresetChange={props.onExportQualityPresetChange ?? (() => {})}
                  onStartRecording={props.onStartRecording}
                  onStopRecording={props.onStopRecording}
                  canUsePremiumExport={props.canUsePremiumExport}
                />
              </CollapsibleSection>
            </div>
          )}
      </motion.div>

      {/* Toggle Button - Only visible when panel is closed */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          variant="outline"
          className="fixed top-4 left-4 z-[100] bg-black/50 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/70"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      )}
    </>
  );
}