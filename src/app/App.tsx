import { ControlPanel } from "@/app/components/ControlPanel";
import { SoundPanel } from "@/app/components/SoundPanel";
import { BodySegmentationLayer } from "@/app/components/BodySegmentationLayer";
import { RawVideoLayer } from "@/app/components/RawVideoLayer";
import { ShaderLayer } from "@/app/components/ShaderLayer";
import { KaleidoscopeLayer } from "@/app/components/KaleidoscopeLayer";
import { FilmGrainLayer } from "@/app/components/FilmGrainLayer";
import { BlobTrackingLayer } from "@/app/components/BlobTrackingLayer";
import { GridBackgroundLayer } from "@/app/components/GridBackgroundLayer";
import { PoseEstimationLayer } from "@/app/components/PoseEstimationLayer";
import { MotionAnalysisOverlay } from "@/app/components/MotionAnalysisOverlay";
import { PitchDeckModal } from "@/app/components/PitchDeckModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { useIsMobile } from "@/app/components/ui/use-mobile";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import VideoToFramesApp from "./video-to-frames/VideoToFramesApp";
import MovaScoreApp from "./mova-score/MovaScoreApp";

type AppMode = 'mova-parque' | 'video-to-frames' | 'mova-score';
import {
  getShaderPreset,
  getDefaultShader,
  defaultVertexShader,
} from "./shaders/index";
import { AudioEngine } from "@/app/audio/AudioEngine";
import {
  DEFAULT_BLOB_CONFIG,
  BlobTrackingConfig,
} from "@/utils/blobTracking";
import { blobTrackingColorPresets } from "@/utils/colorTheory";
import { GridConfig } from "@/utils/gridRenderer";
import { PoseFrame } from "@/utils/poseTracking";
import { MetricsSnapshot } from "@/utils/motionMetrics";
import {
  getRecordingDimensions,
  startRecording,
  EXPORT_QUALITY_BITRATE,
  type VideoSourceForRecording,
  type ExportFrameRate,
  type ExportQualityPreset,
} from "@/app/recording";

// Helper function to determine palette based on time of day
function getPaletteFromTimeOfDay(): number {
  const hour = new Date().getHours();

  if (hour >= 23 || hour < 5) return 0; // Stasis (11pm-5am)
  if (hour >= 5 && hour < 9) return 1; // Tension (5am-9am)
  if (hour >= 9 && hour < 15) return 2; // Flow (9am-3pm)
  if (hour >= 15 && hour < 19) return 3; // Drive (3pm-7pm)
  return 4; // Kinetic (7pm-11pm)
}

// Color palettes for different moods
const palettes = [
  // Palette 0: Stasis - Cool Blue/Purple
  ["#1a0f2e", "#2d1b69", "#4a5899", "#7b9eb0", "#b4d4e1"],
  // Palette 1: Tension - Warm Coral/Pink
  ["#1a0a0f", "#4a1f2f", "#d4456f", "#ff7b54", "#ffa577"],
  // Palette 2: Flow - Healing Greens
  ["#0f1a15", "#1f4a3a", "#2d8659", "#5ab88f", "#9de0c5"],
  // Palette 3: Drive - Active Amber/Gold
  ["#1a1108", "#4a3520", "#d48b20", "#ffb847", "#ffe5a0"],
  // Palette 4: Kinetic - Energetic Sunrise
  ["#2a0f00", "#ff4400", "#ff7700", "#ffaa00", "#ffdd44"],
];

// Helper to convert hex color to vec3 (0-1 range)
function hexToVec3(hex: string): number[] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('mova-parque');
  const initialPalette = getPaletteFromTimeOfDay();
  const [activePreset, setActivePreset] = useState(
    initialPalette.toString(),
  );
  const [mood, setMood] = useState({
    colorPalette: initialPalette,
    brightness: 0.3,
  });
  const [movement, setMovement] = useState({
    trailLength: 0.7,
  });
  const [atmosphere, setAtmosphere] = useState({
    haziness: 0.8,
    depth: 1.5,
    blendMode: 'normal', // Default to normal
    noise: 0.042, // Film grain = 42 (displayed as noise * 1000)
    grainSpeed: 2, // Grain speed = 2
  });
  const [background, setBackground] = useState({
    kaleidoscope: "none", // 'none', 'horizontal', 'vertical', 'radial'
  });
  const [gridBackground, setGridBackground] = useState<GridConfig>({
    enabled: true, // Grid ON by default
    style: "dots",
    color: "#757575", // rgb(117, 117, 117)
    size: 72,
    lineWidth: 2,
    offsetX: 0.5,
    offsetY: 0.5,
    rotation: 0,
    opacity: 1, // grid lines 100% by default
    backgroundColor: "#000000",
    backgroundOpacity: 0, // background 0% so shader is fully visible by default
  });
  const [camera, setCamera] = useState({
    enabled: false,
    showBackground: false, // GLSL OFF by default
    showRawVideo: true, // Original Video Background enabled by default
    rawVideoOpacity: 1.0,
  });
  const [bodySegmentation, setBodySegmentation] = useState({
    enabled: true, // Body segmentation ON by default
  });
  const [bodyEffects, setBodyEffects] = useState({
    ghostTrail: 1.0,
    ghostFrames: 15,
    ghostDecay: 0.51,
    ghostSpeed: 0.95,
    visibility: 1.0, // Visibility (Fallback) = 100% by default
    livePersonVisibility: 1.0, // Live Person Visibility = 100% by default
    trailColorGradient: 0.9,
    showGhostTrails: true,
  });
  const [cameraStream, setCameraStream] =
    useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<
    "user" | "environment"
  >("user");

  const isMobile = useIsMobile();
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  useEffect(() => {
    if (appMode !== "mova-parque" || !isMobile) return;
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("mova-parque-mobile-warning-seen")) return;
    setShowMobileWarning(true);
  }, [appMode, isMobile]);

  // Shared video element for webcam (single source of truth)
  // Initialize the video element
  const sharedWebcamVideoRef = useRef<HTMLVideoElement | null>(null);
  
  useEffect(() => {
    // Update video element with stream (element is now in DOM via React ref)
    if (sharedWebcamVideoRef.current && cameraStream) {
      const video = sharedWebcamVideoRef.current;
      
      // Only set srcObject if it's different (avoid reload)
      if (video.srcObject !== cameraStream) {
        video.srcObject = cameraStream;
        
        // Wait for metadata to load before playing
        const handleLoadedMetadata = () => {
          video.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Shared webcam video play error:', err);
            }
          });
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        // Also try to play immediately (in case metadata is already loaded)
        video.play().catch(() => {
          // Ignore - will retry after loadedmetadata
        });
      }
    } else if (sharedWebcamVideoRef.current && !cameraStream) {
      // Clear stream when camera is turned off
      sharedWebcamVideoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  // Video upload state
  const [videoSource, setVideoSource] = useState<{
    type: "webcam" | "upload";
    videoElement: HTMLVideoElement | null;
    objectUrl: string | null;
    metadata: {
      duration: number;
      width: number;
      height: number;
      fileName: string;
    } | null;
  }>({
    type: "webcam",
    videoElement: null,
    objectUrl: null,
    metadata: null,
  });
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [placeholderLoaded, setPlaceholderLoaded] = useState(false);

  // Recording & Export state (mova-parque only)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const recordingEngineRef = useRef<ReturnType<typeof startRecording> | null>(null);
  const [exportFrameRate, setExportFrameRate] = useState<ExportFrameRate>(30);
  const [exportQualityPreset, setExportQualityPreset] = useState<ExportQualityPreset>("standard");

  // Motion analysis state
  const [motionAnalysis, setMotionAnalysis] = useState({
    enabled: true,
    showSkeleton: true,
    showMetrics: true,
    skeletonColor: '#009dff',
    skeletonLineWidth: 1,
    jointSize: 3,
    lineStyle: 'solid' as 'solid' | 'dashed',
    showJointAngles: false,
    showROM: false,
    enabledBones: Array(12).fill(true), // 12 bone connections (8 limbs + 2 torso + 2 cross-body)
    enabledJoints: Array(17).fill(true), // 17 COCO keypoints
    jointAngleTextSize: 14,
    jointAngleTextColor: '#009dff',
    jointAngleBgColor: '#000000',
    romTextSize: 10,
    romTextColor: '#009dff',
    romBgColor: '#000000',
    enabledMetricsJoints: {
      left_knee: true,
      right_knee: true,
      left_hip: true,
      right_hip: true,
      left_elbow: true,
      right_elbow: true,
    },
  });
  const [metricsSnapshot, setMetricsSnapshot] = useState<MetricsSnapshot | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<MetricsSnapshot[]>([]);

  // Refs for canvas layers (if needed in the future)
  // const bodyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Blob tracking state
  const [blobTracking, setBlobTracking] =
    useState<BlobTrackingConfig>(DEFAULT_BLOB_CONFIG);

  // Update blob tracking colors when mood changes
  useEffect(() => {
    const colorPreset =
      blobTrackingColorPresets[mood.colorPalette];
    setBlobTracking((prev: BlobTrackingConfig) => ({
      ...prev,
      ...colorPreset,
    }));
  }, [mood.colorPalette]);

  // Shader state with library support - NOW ENABLED BY DEFAULT WITH CLASSIC GRADIENT
  const defaultShader = getDefaultShader();
  const [shaderState, setShaderState] = useState({
    renderMode: "shader-background" as
      | "disabled"
      | "shader-only"
      | "shader-background",
    currentPresetId: defaultShader.id,
    currentFragmentShader: defaultShader.fragmentShader,
    currentVertexShader: defaultVertexShader,
    uniforms: { ...defaultShader.uniforms },
    isEditing: false,
    originalPresetFragment: defaultShader.fragmentShader,
    originalPresetVertex: defaultVertexShader,
    compileError: null as string | null,
  });

  // Update shader uniforms when mood/atmosphere changes
  useEffect(() => {
    const palette = palettes[mood.colorPalette];
    const paletteUniforms = {
      u_palette0: hexToVec3(palette[0]),
      u_palette1: hexToVec3(palette[1]),
      u_palette2: hexToVec3(palette[2]),
      u_palette3: hexToVec3(palette[3]),
      u_palette4: hexToVec3(palette[4]),
    };

    setShaderState((prev) => {
      // Start with palette uniforms (always needed)
      const updatedUniforms: { [key: string]: number | number[] } = {
        ...prev.uniforms,
        ...paletteUniforms,
      };

      // Only add other uniforms if they already exist in current uniforms
      // (meaning the current preset uses them)
      if ("u_brightness" in prev.uniforms)
        updatedUniforms.u_brightness = mood.brightness;
      if ("u_haziness" in prev.uniforms)
        updatedUniforms.u_haziness = atmosphere.haziness;
      if ("u_depth" in prev.uniforms)
        updatedUniforms.u_depth = atmosphere.depth;
      if ("u_noise" in prev.uniforms)
        updatedUniforms.u_noise = atmosphere.noise;
      if ("u_motion" in prev.uniforms)
        updatedUniforms.u_motion = movement.trailLength;

      return {
        ...prev,
        uniforms: updatedUniforms,
      };
    });
  }, [
    mood.colorPalette,
    mood.brightness,
    atmosphere.haziness,
    atmosphere.depth,
    movement.trailLength,
  ]);

  // Sound Design State
  const [soundDesign, setSoundDesign] = useState({
    enabled: false,
    masterVolume: 0.8,
    sonicPreset: initialPalette,
    layers: {
      drone: 0.45,
      atmosphere: 0.81,
      shimmer: 0.99,
      pulse: 0,
      reactive: 0.4,
    },
    harmonic: {
      complexity: 0.33,
      progressionSpeed: 0.5,
      brightness: 0.5,
      richness: 0.5,
    },
    reactivity: {
      motionSensitivity: 0.5,
      velocityInfluence: 0.5,
      proximityEffect: 0.5,
    },
    effects: {
      reverb: 0.15,
      delay: 0.3,
      filter: 0.72,
    },
  });

  const [isPitchDeckOpen, setIsPitchDeckOpen] = useState(false);

  // Audio Engine instance
  const audioEngineRef = useRef<AudioEngine | null>(null);

  // Initialize audio engine
  useEffect(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioEngine();
    }

    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
    };
  }, []);

  // Handle audio enabled/disabled
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setEnabled(soundDesign.enabled);
    }
  }, [soundDesign.enabled]);

  // Update audio engine settings
  useEffect(() => {
    if (audioEngineRef.current && soundDesign.enabled) {
      audioEngineRef.current.updateSettings(soundDesign);
    }
  }, [soundDesign, soundDesign.enabled]);

  const handleMoodChange = (key: string, value: number) => {
    setMood((prev) => ({ ...prev, [key]: value }));
  };

  const handleMovementChange = (key: string, value: number) => {
    setMovement((prev) => ({ ...prev, [key]: value }));
  };

  const handleAtmosphereChange = (
    key: string,
    value: number,
  ) => {
    setAtmosphere((prev) => ({ ...prev, [key]: value }));
  };

  const handleAtmosphereBlendModeChange = (
    blendMode: string,
  ) => {
    setAtmosphere((prev) => ({ ...prev, blendMode }));
  };

  const handleBackgroundChange = (
    key: string,
    value: number | string,
  ) => {
    setBackground((prev) => ({ ...prev, [key]: value }));
  };

  const handleGridBackgroundChange = (
    key: keyof GridConfig,
    value: number | string | boolean,
  ) => {
    setGridBackground((prev) => ({ ...prev, [key]: value as any }));
  };

  // Motion Analysis Handlers
  const handlePoseData = useCallback((_pose: PoseFrame) => {
    // Pose data is handled by metrics, no need to store separately
  }, []);

  const handleMetricsData = useCallback((metrics: MetricsSnapshot) => {
    setMetricsSnapshot(metrics);
    // Update history for charts (keep last 300 frames)
    setMetricsHistory(prev => {
      const updated = [...prev, metrics];
      return updated.slice(-300);
    });
  }, []);

  const handleMotionAnalysisChange = useCallback((
    key: string,
    value: any
  ) => {
    setMotionAnalysis(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCameraChange = (key: string, value: boolean) => {
    setCamera((prev) => {
      const updated = { ...prev, [key]: value };

      // UX fix: When camera is disabled, automatically show background
      // to prevent black screen
      if (key === "enabled" && value === false) {
        updated.showBackground = true;
      }

      return updated;
    });
  };

  const handleCameraNumberChange = (
    key: string,
    value: number,
  ) => {
    setCamera((prev) => ({ ...prev, [key]: value }));
  };

  const handleBodyEffectsChange = (
    key: string,
    value: number | boolean,
  ) => {
    setBodyEffects((prev) => ({ ...prev, [key]: value }));
  };

  const handleBodySegmentationChange = (
    key: string,
    value: boolean,
  ) => {
    setBodySegmentation((prev) => {
      const updated = { ...prev, [key]: value };
      return updated;
    });
  };

  const handlePresetChange = (paletteIndex: string) => {
    setActivePreset(paletteIndex);
    setMood((prev) => ({
      ...prev,
      colorPalette: parseInt(paletteIndex),
    }));
  };

  // Sound Design Handlers
  const handleSoundDesignChange = (
    key: string,
    value: number | boolean,
  ) => {
    setSoundDesign((prev) => ({ ...prev, [key]: value }));
  };

  const handleLayerChange = (key: string, value: number) => {
    setSoundDesign((prev) => ({
      ...prev,
      layers: { ...prev.layers, [key]: value },
    }));
  };

  const handleHarmonicChange = (key: string, value: number) => {
    setSoundDesign((prev) => ({
      ...prev,
      harmonic: { ...prev.harmonic, [key]: value },
    }));
  };

  const handleReactivityChange = (
    key: string,
    value: number,
  ) => {
    setSoundDesign((prev) => ({
      ...prev,
      reactivity: { ...prev.reactivity, [key]: value },
    }));
  };

  const handleEffectsChange = (key: string, value: number) => {
    setSoundDesign((prev) => ({
      ...prev,
      effects: { ...prev.effects, [key]: value },
    }));
  };

  const handleSonicPresetChange = (preset: number) => {
    setSoundDesign((prev) => ({
      ...prev,
      sonicPreset: preset,
    }));
    if (audioEngineRef.current) {
      audioEngineRef.current.setPreset(preset);
    }
  };

  // Shader Handlers
  const handleShaderRenderModeChange = (
    mode: "disabled" | "shader-only" | "shader-background",
  ) => {
    setShaderState((prev) => ({ ...prev, renderMode: mode }));
  };

  const handleShaderUniformChange = (
    name: string,
    value: number | number[],
  ) => {
    setShaderState((prev) => ({
      ...prev,
      uniforms: { ...prev.uniforms, [name]: value },
    }));
  };

  const handleShaderCompileError = (error: string | null) => {
    setShaderState((prev) => ({
      ...prev,
      compileError: error,
    }));
  };

  // Shader library and editing handlers
  const handleShaderPresetChange = (presetId: string) => {
    const preset = getShaderPreset(presetId);
    if (!preset) return;

    // Get current palette uniforms to preserve them
    const palette = palettes[mood.colorPalette];
    const paletteUniforms = {
      u_palette0: hexToVec3(palette[0]),
      u_palette1: hexToVec3(palette[1]),
      u_palette2: hexToVec3(palette[2]),
      u_palette3: hexToVec3(palette[3]),
      u_palette4: hexToVec3(palette[4]),
    };

    // Merge preset uniforms with palette colors
    // Only include other dynamic uniforms if they exist in the preset's default uniforms
    const mergedUniforms: { [key: string]: number | number[] } = {
      ...preset.uniforms,
      ...paletteUniforms,
    };

    // Add common uniforms if they're defined in the preset
    if ("u_brightness" in preset.uniforms)
      mergedUniforms.u_brightness = mood.brightness;
    if ("u_haziness" in preset.uniforms)
      mergedUniforms.u_haziness = atmosphere.haziness;
    if ("u_depth" in preset.uniforms)
      mergedUniforms.u_depth = atmosphere.depth;
    if ("u_noise" in preset.uniforms)
      mergedUniforms.u_noise = atmosphere.noise;
    if ("u_motion" in preset.uniforms)
      mergedUniforms.u_motion = movement.trailLength;

    setShaderState((prev) => ({
      ...prev,
      currentPresetId: preset.id,
      currentFragmentShader: preset.fragmentShader,
      currentVertexShader: defaultVertexShader,
      uniforms: mergedUniforms,
      isEditing: false,
      originalPresetFragment: preset.fragmentShader,
      originalPresetVertex: defaultVertexShader,
      compileError: null,
    }));
  };

  const handleShaderCodeChange = (code: string) => {
    setShaderState((prev) => ({
      ...prev,
      currentFragmentShader: code,
      isEditing: code !== prev.originalPresetFragment,
    }));
  };

  const handleVertexShaderCodeChange = (code: string) => {
    setShaderState((prev) => ({
      ...prev,
      currentVertexShader: code,
      isEditing:
        code !== prev.originalPresetVertex ||
        prev.currentFragmentShader !==
          prev.originalPresetFragment,
    }));
  };

  const handleShaderCodeReset = () => {
    setShaderState((prev) => ({
      ...prev,
      currentFragmentShader: prev.originalPresetFragment,
      currentVertexShader: prev.originalPresetVertex,
      isEditing: false,
      compileError: null,
    }));
  };

  // Blob Tracking Handlers
  const handleBlobTrackingChange = (
    key: keyof BlobTrackingConfig,
    value: any,
  ) => {
    setBlobTracking((prev: BlobTrackingConfig) => ({ ...prev, [key]: value }));
  };

  // Video Upload Handlers
  const handleVideoSelect = useCallback(async (file: File) => {
    setIsVideoUploading(true);

    try {
      // Create object URL
      const objectUrl = URL.createObjectURL(file);

      // Create video element
      const video = document.createElement("video");
      video.src = objectUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      // Wait for metadata to load
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Failed to load video"));
      });

      // Start playing
      await video.play();

      // Turn off webcam if it's active (must happen before updating videoSource)
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }

      // Update state
      setVideoSource({
        type: "upload",
        videoElement: video,
        objectUrl: objectUrl,
        metadata: {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          fileName: file.name,
        },
      });

      // Enable camera to show the video processing
      setCamera((prev) => ({ ...prev, enabled: true }));
    } catch (error) {
      console.error("Error loading video:", error);
      // Clean up on error
      if (videoSource.objectUrl) {
        URL.revokeObjectURL(videoSource.objectUrl);
      }
    } finally {
      setIsVideoUploading(false);
    }
  }, [cameraStream, videoSource.objectUrl]);

  const handleClearVideo = useCallback(() => {
    // Clean up video resources
    if (videoSource.objectUrl) {
      URL.revokeObjectURL(videoSource.objectUrl);
    }
    if (videoSource.videoElement) {
      videoSource.videoElement.pause();
      videoSource.videoElement.src = "";
    }

    // Reset to webcam
    setVideoSource({
      type: "webcam",
      videoElement: null,
      objectUrl: null,
      metadata: null,
    });
  }, [videoSource]);

  const handleSwitchToWebcam = useCallback(async () => {
    // If webcam is already on, turn it off
    if (cameraStream) {
      // Stop all tracks
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      
      // Reset video source if it was set to webcam
      if (videoSource.type === "webcam") {
        setVideoSource({
          type: "webcam",
          videoElement: null,
          objectUrl: null,
          metadata: null,
        });
      }
      return;
    }

    // Clean up uploaded video if active
    if (videoSource.type === "upload" && videoSource.objectUrl) {
      URL.revokeObjectURL(videoSource.objectUrl);
    }
    if (videoSource.videoElement) {
      videoSource.videoElement.pause();
      videoSource.videoElement.src = "";
    }

    // Reset to webcam
    setVideoSource({
      type: "webcam",
      videoElement: null,
      objectUrl: null,
      metadata: null,
    });

    // Request webcam stream (single source of truth - only requested here)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: cameraFacingMode },
        audio: false,
      });
      setCameraStream(stream);

      // Auto-disable motion analysis for webcam (pose detection doesn't work reliably with webcam)
      if (motionAnalysis.enabled) {
        handleMotionAnalysisChange("enabled", false);
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
      // Reset state on error
      setVideoSource({
        type: "webcam",
        videoElement: null,
        objectUrl: null,
        metadata: null,
      });
    }
  }, [videoSource, cameraStream, cameraFacingMode, motionAnalysis.enabled, handleMotionAnalysisChange]);

  const handleSwitchCamera = useCallback(async () => {
    if (!cameraStream) return;
    cameraStream.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    const nextMode =
      cameraFacingMode === "user" ? "environment" : "user";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: nextMode },
        audio: false,
      });
      setCameraStream(stream);
      setCameraFacingMode(nextMode);
    } catch (error) {
      console.error("Error switching camera:", error);
      setCameraFacingMode(cameraFacingMode);
    }
  }, [cameraStream, cameraFacingMode]);

  // Recording handlers (mova-parque)
  const handleStartRecording = useCallback(() => {
    const source = videoSource as VideoSourceForRecording;
    const dims = getRecordingDimensions(source, cameraStream);
    if (dims.width <= 0 || dims.height <= 0) return;
    if (
      (source.type === "upload" && !source.videoElement) ||
      (source.type === "webcam" && !cameraStream)
    ) {
      return;
    }
    try {
      const handle = startRecording({
        width: dims.width,
        height: dims.height,
        frameRate: exportFrameRate,
        videoBitsPerSecond: EXPORT_QUALITY_BITRATE[exportQualityPreset],
        kaleidoscopeMode: background.kaleidoscope as "none" | "horizontal" | "vertical" | "radial",
        grainIntensity: atmosphere.noise,
        showRawVideo: camera.showRawVideo,
        rawVideoElement:
          source.type === "upload" ? source.videoElement : sharedWebcamVideoRef.current,
        rawVideoOpacity: camera.rawVideoOpacity,
        layerToggles: {
          bodySegmentationEnabled: bodySegmentation.enabled,
          motionAnalysisEnabled: motionAnalysis.enabled,
          blobTrackingEnabled: blobTracking.enabled,
          showBackground: camera.showBackground,
          showGhostTrails: bodyEffects.showGhostTrails,
        },
      });
      recordingEngineRef.current = handle;
      setIsRecording(true);
      setRecordingStartTime(Date.now());
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [
    videoSource,
    cameraStream,
    exportFrameRate,
    exportQualityPreset,
    background.kaleidoscope,
    atmosphere.noise,
    camera.showRawVideo,
    camera.rawVideoOpacity,
    camera.showBackground,
    bodySegmentation.enabled,
    motionAnalysis.enabled,
    blobTracking.enabled,
    bodyEffects.showGhostTrails,
  ]);

  const handleStopRecording = useCallback(async () => {
    const handle = recordingEngineRef.current;
    if (!handle) {
      setIsRecording(false);
      setRecordingStartTime(null);
      return;
    }
    try {
      const { blob, extension } = await handle.stop();
      recordingEngineRef.current = null;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mova-parque-${Date.now()}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to stop recording:", err);
    } finally {
      setIsRecording(false);
      setRecordingStartTime(null);
    }
  }, []);

  // Auto-load placeholder video on mount
  useEffect(() => {
    const loadPlaceholderVideo = async () => {
      // Only load if not already loaded and no video source exists
      if (placeholderLoaded || videoSource.videoElement) return;

      try {
        // Fetch placeholder video from public folder
        const response = await fetch('/videos/placeholder.mp4');
        if (!response.ok) {
          // Silent fallback - placeholder not found, continue without it
          return;
        }

        const blob = await response.blob();
        const file = new File([blob], 'placeholder.mp4', { type: 'video/mp4' });

        // Use existing handleVideoSelect to load the video
        await handleVideoSelect(file);
        setPlaceholderLoaded(true);
      } catch (error) {
        // Silent fallback - if placeholder fails to load, continue without it
      }
    };

    loadPlaceholderVideo();
  }, [placeholderLoaded, videoSource.videoElement, handleVideoSelect]);

  // Cleanup video on unmount
  useEffect(() => {
    return () => {
      if (videoSource.objectUrl) {
        URL.revokeObjectURL(videoSource.objectUrl);
      }
    };
  }, [videoSource.objectUrl]);

  // Render based on app mode
  if (appMode === 'video-to-frames') {
    return <VideoToFramesApp appMode={appMode} onAppModeChange={setAppMode} />;
  }
  
  if (appMode === 'mova-score') {
    return <MovaScoreApp appMode={appMode} onAppModeChange={setAppMode} />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <FilmGrainLayer
        intensity={atmosphere.noise}
        animationSpeed={atmosphere.grainSpeed}
      >
        <KaleidoscopeLayer
          mode={
            background.kaleidoscope as
              | "none"
              | "horizontal"
              | "vertical"
              | "radial"
          }
          blendMode={atmosphere.blendMode}
          videoSource={
            videoSource.type === "upload"
              ? videoSource.videoElement
              : cameraStream
          }
        >
          {/* Shader background layer - Conditionally visible based on showBackground toggle */}
          {camera.showBackground && (
            <ShaderLayer
              key={`shader-${videoSource.type}-${videoSource.videoElement ? 'upload' : 'webcam'}-${videoSource.metadata?.fileName || 'none'}`}
              mode={shaderState.renderMode}
              fragmentShaderCode={
                shaderState.currentFragmentShader
              }
              vertexShaderCode={shaderState.currentVertexShader}
              uniforms={shaderState.uniforms}
              onCompileError={handleShaderCompileError}
              videoSource={
                videoSource.type === "upload"
                  ? videoSource.videoElement
                  : cameraStream
              }
            />
          )}

          {/* Grid background layer - Behind body effects, in front of shader */}
          <GridBackgroundLayer
            enabled={gridBackground.enabled}
            config={gridBackground}
            videoSource={
              videoSource.type === "upload"
                ? videoSource.videoElement
                : cameraStream
            }
          />

          {/* Middle layer: Ghost trails and person segmentation with blend mode */}
          {bodySegmentation.enabled && (
            <BodySegmentationLayer
              enabled={
                (videoSource.type === "upload" && videoSource.videoElement !== null) ||
                (videoSource.type === "webcam" && cameraStream !== null)
              }
              videoSource={videoSource.type === "upload" ? videoSource.videoElement : null}
              sharedWebcamVideoRef={sharedWebcamVideoRef}
              bodyEffects={bodyEffects}
              mood={mood}
              atmosphere={atmosphere}
            />
          )}

          {/* Pose Estimation Layer - Above body effects (only for uploaded videos) */}
          <PoseEstimationLayer
            enabled={
              motionAnalysis.enabled &&
              videoSource.type === "upload" &&
              videoSource.videoElement !== null
            }
            videoSource={videoSource.videoElement}
            onPoseData={handlePoseData}
            onMetricsData={handleMetricsData}
            showSkeleton={motionAnalysis.showSkeleton}
            skeletonColor={motionAnalysis.skeletonColor}
            skeletonLineWidth={motionAnalysis.skeletonLineWidth}
            jointSize={motionAnalysis.jointSize}
            lineStyle={motionAnalysis.lineStyle}
            showJointAngles={motionAnalysis.showJointAngles}
            showROM={motionAnalysis.showROM}
            enabledBones={motionAnalysis.enabledBones}
            enabledJoints={motionAnalysis.enabledJoints}
            metrics={metricsSnapshot}
            jointAngleTextSize={motionAnalysis.jointAngleTextSize}
            jointAngleTextColor={motionAnalysis.jointAngleTextColor}
            jointAngleBgColor={motionAnalysis.jointAngleBgColor}
            romTextSize={motionAnalysis.romTextSize}
            romTextColor={motionAnalysis.romTextColor}
            romBgColor={motionAnalysis.romBgColor}
          />

          {/* Raw video layer - Only for uploaded videos (webcam is handled separately in App.tsx) */}
          {videoSource.type === "upload" && videoSource.videoElement && (
            <RawVideoLayer
              videoSource={videoSource.videoElement}
              opacity={camera.showRawVideo ? camera.rawVideoOpacity : 0}
              enabled={true}
            />
          )}

          {/* Blob tracking layer - Renders at z-index 10 (below kaleidoscope) */}
          <BlobTrackingLayer
            config={blobTracking}
            videoSource={
              videoSource.type === "upload"
                ? videoSource.videoElement
                : cameraStream
            }
            sharedWebcamVideoRef={sharedWebcamVideoRef}
          />
        </KaleidoscopeLayer>
      </FilmGrainLayer>


      {/* Motion Analysis Overlay - UI overlay */}
      {motionAnalysis.enabled && (
          <MotionAnalysisOverlay
            enabled={motionAnalysis.enabled}
            metrics={metricsSnapshot}
            metricsHistory={metricsHistory}
            enabledMetricsJoints={motionAnalysis.enabledMetricsJoints}
          />
      )}

      <ControlPanel
        appMode={appMode}
        onAppModeChange={setAppMode}
        mood={mood}
        movement={movement}
        atmosphere={atmosphere}
        background={background}
        bodyEffects={bodyEffects}
        camera={camera}
        shader={shaderState}
        blobTracking={blobTracking}
        gridBackground={gridBackground}
        onMoodChange={handleMoodChange}
        onMovementChange={handleMovementChange}
        onAtmosphereChange={handleAtmosphereChange}
        onAtmosphereBlendModeChange={
          handleAtmosphereBlendModeChange
        }
        onBackgroundChange={handleBackgroundChange}
        onBodyEffectsChange={handleBodyEffectsChange}
        bodySegmentation={bodySegmentation}
        onBodySegmentationChange={handleBodySegmentationChange}
        onCameraChange={handleCameraChange}
        onCameraNumberChange={handleCameraNumberChange}
        onPresetChange={handlePresetChange}
        onShaderRenderModeChange={handleShaderRenderModeChange}
        onShaderUniformChange={handleShaderUniformChange}
        onShaderPresetChange={handleShaderPresetChange}
        onShaderCodeChange={handleShaderCodeChange}
        onVertexShaderCodeChange={handleVertexShaderCodeChange}
        onShaderCodeReset={handleShaderCodeReset}
        onBlobTrackingChange={handleBlobTrackingChange}
        onGridBackgroundChange={handleGridBackgroundChange}
        motionAnalysis={motionAnalysis}
        onMotionAnalysisChange={handleMotionAnalysisChange}
        activePreset={activePreset}
        onOpenPitchDeck={() => setIsPitchDeckOpen(true)}
        videoSource={videoSource}
        isVideoUploading={isVideoUploading}
        onVideoSelect={handleVideoSelect}
        onClearVideo={handleClearVideo}
        onSwitchToWebcam={handleSwitchToWebcam}
        onSwitchCamera={handleSwitchCamera}
        cameraStream={cameraStream}
        isRecording={isRecording}
        recordingStartTime={recordingStartTime}
        exportFrameRate={exportFrameRate}
        onExportFrameRateChange={setExportFrameRate}
        exportQualityPreset={exportQualityPreset}
        onExportQualityPresetChange={setExportQualityPreset}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />

      {/* SoundPanel hidden for now - keeping AudioEngine code for future use */}
      {false && (
        <SoundPanel
          soundDesign={soundDesign}
          onSoundDesignChange={handleSoundDesignChange}
          onLayerChange={handleLayerChange}
          onHarmonicChange={handleHarmonicChange}
          onReactivityChange={handleReactivityChange}
          onEffectsChange={handleEffectsChange}
          onPresetChange={handleSonicPresetChange}
        />
      )}

      <PitchDeckModal
        isOpen={isPitchDeckOpen}
        onClose={() => setIsPitchDeckOpen(false)}
      />

      {/* Mobile warning - one-time per session when on Mova Parque */}
      <Dialog
        open={showMobileWarning}
        onOpenChange={(open) => {
          if (!open) {
            setShowMobileWarning(false);
            try {
              sessionStorage.setItem("mova-parque-mobile-warning-seen", "1");
            } catch (_) {}
          }
        }}
      >
        <DialogContent className="bg-black/95 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Heads up</DialogTitle>
            <DialogDescription className="text-white/60">
              Uploading or processing some videos on mobile can be slow. For the
              best experience, we recommend using a desktop browser.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => {
                setShowMobileWarning(false);
                try {
                  sessionStorage.setItem(
                    "mova-parque-mobile-warning-seen",
                    "1",
                  );
                } catch (_) {}
              }}
              className="px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-light hover:bg-white/30 transition-colors"
            >
              Got it
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video element for webcam - MUST be in DOM for TensorFlow.js to work */}
      {/* Used for both processing (hidden) and display (visible when camera.showRawVideo is true) */}
      {cameraStream && (
        <video
          ref={sharedWebcamVideoRef}
          className="pointer-events-none z-[2]"
          style={{
            visibility: camera.showRawVideo ? 'visible' : 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover', // Fill screen, crop edges if needed (matches body segmentation behavior)
            opacity: camera.showRawVideo ? camera.rawVideoOpacity : 0,
          }}
          playsInline
          muted
          autoPlay
        />
      )}
    </div>
  );
}