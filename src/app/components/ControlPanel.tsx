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
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { getShaderPreset } from "../shaders/index";
import { BlobTrackingConfig } from "@/utils/blobTracking";
import { GridConfig } from "@/utils/gridRenderer";
import { VideoUpload } from "./VideoUpload";
import { RecordAndExport } from "./RecordAndExport";
import type { ExportFrameRate, ExportQualityPreset } from "@/app/recording";

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
    visibility: number;
    livePersonVisibility: number;
    trailColorGradient: number;
    showGhostTrails: boolean;
  };
  camera: {
    enabled: boolean;
    showBackground: boolean;
    showRawVideo: boolean;
    rawVideoOpacity: number;
  };
  shader: {
    renderMode:
      | "disabled"
      | "shader-only"
      | "shader-background";
    currentPresetId: string;
    currentFragmentShader: string;
    currentVertexShader: string;
    uniforms: {
      [key: string]: number | number[];
    };
    compileError: string | null;
    isEditing: boolean;
  };
  blobTracking: BlobTrackingConfig;
  gridBackground: GridConfig;
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
  onPresetChange: (preset: string) => void;
  onShaderRenderModeChange: (
    mode: "disabled" | "shader-only" | "shader-background",
  ) => void;
  onShaderUniformChange: (
    name: string,
    value: number | number[],
  ) => void;
  onShaderPresetChange: (presetId: string) => void;
  onShaderCodeChange: (code: string) => void;
  onVertexShaderCodeChange: (code: string) => void;
  onShaderCodeReset: () => void;
  onBlobTrackingChange: (
    key: keyof BlobTrackingConfig,
    value: any,
  ) => void;
  onGridBackgroundChange: (
    key: keyof GridConfig,
    value: number | string | boolean,
  ) => void;
  onMotionAnalysisChange: (key: string, value: any) => void;
  activePreset: string;
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
  exportFrameRate?: ExportFrameRate;
  onExportFrameRateChange?: (rate: ExportFrameRate) => void;
  exportQualityPreset?: ExportQualityPreset;
  onExportQualityPresetChange?: (preset: ExportQualityPreset) => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  canUsePremiumExport?: boolean;
  onRequestSignIn?: () => void;
}

const paletteNames = [
  "Stasis",
  "Tension",
  "Flow",
  "Drive",
  "Kinetic",
];

const paletteColors = [
  ["#2d1b69", "#4a5899", "#7b9eb0"], // Stasis - cool blues
  ["#4a1f2f", "#d4456f", "#ff7b54"], // Tension - warm coral/pink
  ["#1f4a3a", "#2d8659", "#5ab88f"], // Flow - healing greens
  ["#4a3520", "#d48b20", "#ffb847"], // Drive - active amber
  ["#ff4400", "#ff7700", "#ffaa00"], // Kinetic - energetic sunrise
];

export function ControlPanel(props: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();

  // Get current shader preset info
  const currentPreset = getShaderPreset(
    props.shader.currentPresetId,
  );

  // Helper to convert RGB array to hex
  const rgbToHex = (rgb: number[]) => {
    const r = Math.round(rgb[0] * 255)
      .toString(16)
      .padStart(2, "0");
    const g = Math.round(rgb[1] * 255)
      .toString(16)
      .padStart(2, "0");
    const b = Math.round(rgb[2] * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${r}${g}${b}`;
  };

  // Helper to convert hex to RGB array
  const hexToRgb = (hex: string): number[] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  };

  // Render uniform control based on type
  const renderUniformControl = (uniform: any) => {
    const value = props.shader.uniforms[uniform.name];

    if (uniform.type === "color") {
      const hexValue = Array.isArray(value)
        ? rgbToHex(value)
        : (uniform.default as string);

      return (
        <div key={uniform.name} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-white/70 font-light">
              {uniform.label}
            </span>
          </div>
          <input
            type="color"
            value={hexValue}
            onChange={(e) =>
              props.onShaderUniformChange(
                uniform.name,
                hexToRgb(e.target.value),
              )
            }
            className="w-full h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
          />
        </div>
      );
    }

    // Float/number slider
    const numValue =
      typeof value === "number"
        ? value
        : (uniform.default as number);

    return (
      <div key={uniform.name} className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-white/70 font-light">
            {uniform.label}
          </span>
          <span className="text-xs text-white/50 font-light">
            {numValue.toFixed(
              uniform.step && uniform.step < 0.1 ? 2 : 1,
            )}
          </span>
        </div>
        <Slider
          value={[numValue]}
          onValueChange={(val) =>
            props.onShaderUniformChange(uniform.name, val[0])
          }
          min={uniform.min || 0}
          max={uniform.max || 1}
          step={uniform.step || 0.01}
          className="slider-custom"
        />
      </div>
    );
  };

  // Tooltip content for Body & Trails
  const bodyTrailsTooltip = (
    <div className="space-y-2 text-white">
      <p className="font-semibold text-white text-xs mb-2">
        Motion Trails Controls:
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
          <strong>Live Person Visibility:</strong> Opacity of
          the current live person silhouette
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
          <strong>Visibility (Fallback):</strong> Base
          visibility when camera effects are minimal
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
                  Realtime graphics tools driven by movement.{" "}
                  <button
                    onClick={props.onOpenPitchDeck}
                    className="text-[12px] font-thin text-white/60 hover:text-white underline underline-offset-2 decoration-white/30 hover:decoration-white/60 transition-all"
                  >
                    Read our usage guide.
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
              1. Upload or record video
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

            {/* Visual Separator */}
            <div className="border-t border-white/10"></div>

            {/* Body Segmentation Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
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
            title="Motion Trails"
            defaultOpen={false}
          >
            {/* Section description and info button */}
            <div className="pb-0 space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Control motion trail persistence, aura effects,
                and body silhouette appearance.
              </p>
              <ResponsiveInfoPopover
                content={bodyTrailsTooltip}
              />
            </div>

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
                max={90}
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

            {/* Live Person Visibility */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Live Person Visibility
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(
                    props.bodyEffects.livePersonVisibility *
                      100,
                  )}
                </span>
              </div>
              <Slider
                value={[props.bodyEffects.livePersonVisibility]}
                onValueChange={(value) =>
                  props.onBodyEffectsChange(
                    "livePersonVisibility",
                    value[0],
                  )
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>


            {/* Visibility */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Visibility (Fallback)
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(
                    props.bodyEffects.visibility * 100,
                  )}
                </span>
              </div>
              <Slider
                value={[props.bodyEffects.visibility]}
                onValueChange={(value) =>
                  props.onBodyEffectsChange(
                    "visibility",
                    value[0],
                  )
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

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
              </div>
            </div>
          </CollapsibleSection>
                    
          {/* Visual Separator */}
          <div className="border-t border-white/10"></div>

          {/* ========== SECTION 3: TRIPPY SECTION ========== */}
          <CollapsibleSection
            title="The Trippy Section"
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

                {/* Detection Settings */}
                <div className="space-y-4 pt-4">
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
                            className="w-full h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                          />
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
                            className="w-full h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                          />
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
                            className="w-full h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                          />
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
                          <input
                            type="color"
                            value={props.blobTracking.textColor}
                            onChange={(e) =>
                              props.onBlobTrackingChange(
                                "textColor",
                                e.target.value,
                              )
                            }
                            className="w-full h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="border-t border-white/10"></div>
            
            {/* Background Atmosphere - GLSL Shader Controls */}
            <div className="pt-2">
              <CollapsibleSection
                title="Background Atmosphere"
                defaultOpen={false}  // Collapsed by default (easter egg)
              >
                {/* Enable GLSL Background Toggle */}
                <div className="space-y-2 pb-4 border-b border-white/10">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white/70 font-light">
                          Enable GLSL Background
                        </span>
                        <Switch
                          checked={props.camera.showBackground}
                          onCheckedChange={(value) =>
                            props.onCameraChange("showBackground", value)
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="bg-black/95 backdrop-blur-xl border border-white/20 text-white/70 max-w-[200px] "
                    >
                      <p className="text-xs">
                        Toggle off "Original Video Background" to see the GLSL background
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Shader Preset Selection */}
                {props.camera.showBackground && (
                  <>
                    <div className="space-y-2 pb-4 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white/70 font-light">
                          Shader Preset
                        </span>
                      </div>
                      <select
                        value={props.shader.currentPresetId}
                        onChange={(e) =>
                          props.onShaderPresetChange(e.target.value)
                        }
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-sm text-white/90 font-light appearance-none cursor-pointer hover:border-white/40 transition-all focus:outline-none focus:border-white/60"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' fill-opacity='0.5' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                        }}
                      >
                        <option value="classic-gradient">
                          Classic Gradient
                        </option>
                        <option value="atmospheric-haze">
                          Atmospheric Haze
                        </option>
                        <option value="liquid-gradient">
                          Liquid Gradient
                        </option>
                        <option value="plasma-flow">Plasma Flow</option>
                        <option value="chromatic-ripple">
                          Chromatic Ripple
                        </option>
                      </select>
                    </div>

                    {/* Visual Palette Preset Selector */}
                    <div className="space-y-2 pb-4 border-b border-white/10">
                      <Label className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px] underline">
                        Visual Palette
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {paletteNames.map((name, index) => (
                          <button
                            key={index}
                            onClick={() =>
                              props.onPresetChange(index.toString())
                            }
                            className={`relative rounded-lg overflow-hidden border-2 transition-all h-10 group ${
                              props.activePreset === index.toString()
                                ? "border-white/50 shadow-lg shadow-white/20"
                                : "border-white/10 hover:border-white/30"
                            }`}
                            title={name}
                          >
                            {/* Gradient background */}
                            <div className="absolute inset-0 flex">
                              {paletteColors[index].map((color, i) => (
                                <div
                                  key={i}
                                  className="flex-1 transition-all group-hover:scale-105"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            {/* Label */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[11px] font-light text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
                                {name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shader Uniforms - Preset-specific Parameters */}
                    {currentPreset &&
                      currentPreset.uniformMeta &&
                      currentPreset.uniformMeta.length > 0 && (
                        <>
                          {currentPreset.uniformMeta
                            .filter(
                              (u) =>
                                !u.name.startsWith("u_palette") &&
                                u.name !== "u_time" &&
                                u.name !== "u_resolution"
                            )
                            .map(renderUniformControl)}
                        </>
                      )}
                  </>
                )}
              </CollapsibleSection>
            </div>
          </CollapsibleSection>

          {/* Visual Separator */}
          <div className="border-t border-white/10"></div>

          {/* Grid Background */}
          <CollapsibleSection
            title="Grid Background"
            defaultOpen={false}
          >
            {/* Master Enable */}
            <div className="space-y-2 pb-0">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Enable Grid Background
                </span>
                <Switch
                  checked={props.gridBackground.enabled}
                  onCheckedChange={(value) =>
                    props.onGridBackgroundChange("enabled", value)
                  }
                />
              </div>
            </div>

            {/* Grid Style */}
            <div className="space-y-2 pb-2">
              <span className="text-xs text-white/70 font-light">
                Grid Style
              </span>
              <div className="flex flex-wrap gap-2">
                {(["square", "isometric", "polar", "dots"] as const).map(
                  (style) => (
                    <button
                      key={style}
                      onClick={() =>
                        props.onGridBackgroundChange("style", style)
                      }
                      className={`px-3 py-2 rounded-lg text-xs font-light transition-all ${
                        props.gridBackground.style === style
                          ? "bg-white/20 text-white border border-white/30"
                          : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Grid Color */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-light">
                  Grid Color
                </span>
              </div>
              <input
                type="color"
                value={
                  props.gridBackground.color.length === 7
                    ? props.gridBackground.color
                    : props.gridBackground.color.slice(0, 7)
                }
                onChange={(e) =>
                  props.onGridBackgroundChange("color", e.target.value)
                }
                className="w-full h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
              />
            </div>

            {/* Grid Size */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-light">
                  Grid Size
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.gridBackground.size)}px
                </span>
              </div>
              <Slider
                value={[props.gridBackground.size]}
                onValueChange={(value) =>
                  props.onGridBackgroundChange("size", value[0])
                }
                min={10}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Line Width */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-light">
                  Grid Line Width
                </span>
                <span className="text-xs text-white/50 font-light">
                  {props.gridBackground.lineWidth.toFixed(1)}px
                </span>
              </div>
              <Slider
                value={[props.gridBackground.lineWidth]}
                onValueChange={(value) =>
                  props.onGridBackgroundChange("lineWidth", value[0])
                }
                min={0.5}
                max={5}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Line Opacity */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-light">
                  Grid Line Opacity
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.gridBackground.opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[props.gridBackground.opacity]}
                onValueChange={(value) =>
                  props.onGridBackgroundChange("opacity", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Background Color */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-light">
                  Grid Background Color
                </span>
              </div>
              <input
                type="color"
                value={
                  props.gridBackground.backgroundColor.length === 7
                    ? props.gridBackground.backgroundColor
                    : props.gridBackground.backgroundColor.slice(0, 7)
                }
                onChange={(e) =>
                  props.onGridBackgroundChange(
                    "backgroundColor",
                    e.target.value,
                  )
                }
                className="w-full h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
              />
            </div>

            {/* Background Opacity */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-light">
                  Grid Background Opacity
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(
                    props.gridBackground.backgroundOpacity * 100,
                  )}
                  %
                </span>
              </div>
              <Slider
                value={[props.gridBackground.backgroundOpacity]}
                onValueChange={(value) =>
                  props.onGridBackgroundChange(
                    "backgroundOpacity",
                    value[0],
                  )
                }
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>
          </CollapsibleSection>

          {/* Visual Separator */}
          <div className="border-t border-white/10"></div>

          {/* ========== POST PROCESSING ========== */}
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
          </div>
        {props.appMode === "mova-parque" &&
          props.onStartRecording != null &&
          props.onStopRecording != null && (
            <div className="flex-shrink-0 border-t border-white/10 p-2 md:p-4 bg-[#181a1a]">
              <CollapsibleSection title="Record & Export" defaultOpen={false}>
                <RecordAndExport
                  hasVideoSource={
                    (props.videoSource.type === "upload" && props.videoSource.metadata != null) ||
                    props.cameraStream != null
                  }
                  isRecording={props.isRecording ?? false}
                  recordingStartTime={props.recordingStartTime ?? null}
                  exportFrameRate={props.exportFrameRate ?? 30}
                  onExportFrameRateChange={props.onExportFrameRateChange ?? (() => {})}
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