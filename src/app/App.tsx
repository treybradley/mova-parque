import { ControlPanel } from "@/app/components/ControlPanel";
import { SoundPanel } from "@/app/components/SoundPanel";
import { BodySegmentationLayer } from "@/app/components/BodySegmentationLayer";
import { RawVideoLayer } from "@/app/components/RawVideoLayer";
import { KaleidoscopeLayer } from "@/app/components/KaleidoscopeLayer";
import { WatermarkLayer } from "@/app/components/WatermarkLayer";
import { FilmGrainLayer } from "@/app/components/FilmGrainLayer";
import { BlobTrackingLayer } from "@/app/components/BlobTrackingLayer";
import { GridBackgroundLayer } from "@/app/components/GridBackgroundLayer";
import { DepthLayer } from "@/app/components/DepthLayer";
import { PoseEstimationLayer } from "@/app/components/PoseEstimationLayer";
import { MotionAnalysisOverlay } from "@/app/components/MotionAnalysisOverlay";
import { PitchDeckModal } from "@/app/components/PitchDeckModal";
import { SignInModal } from "@/app/components/SignInModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { useAuth } from "@/app/auth/AuthProvider";
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
  type PoseRecordingSample,
} from "@/app/recording";
import { appendPoseRecordingSample } from "@/app/recording/poseInterpolation";

// Helper function to determine palette based on time of day
function getPaletteFromTimeOfDay(): number {
  const hour = new Date().getHours();

  if (hour >= 23 || hour < 5) return 0; // Stasis (11pm-5am)
  if (hour >= 5 && hour < 9) return 1; // Tension (5am-9am)
  if (hour >= 9 && hour < 15) return 2; // Flow (9am-3pm)
  if (hour >= 15 && hour < 19) return 3; // Drive (3pm-7pm)
  return 4; // Kinetic (7pm-11pm)
}

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('mova-parque');
  const initialPalette = getPaletteFromTimeOfDay();
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
    noise: 0.0, // Film grain = 42 (displayed as noise * 1000)
    grainSpeed: 0, // Grain speed = 2
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
    backgroundOpacity: 0,
  });
  const [camera, setCamera] = useState({
    enabled: false,
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
  
  // When true, webcam <video> has ref set and has valid dimensions (so DepthLayer can start its loop)
  const [webcamVideoReady, setWebcamVideoReady] = useState(false);

  useEffect(() => {
    // Update video element with stream (element is now in DOM via React ref)
    if (sharedWebcamVideoRef.current && cameraStream) {
      const video = sharedWebcamVideoRef.current;
      
      // Only set srcObject if it's different (avoid reload)
      if (video.srcObject !== cameraStream) {
        video.srcObject = cameraStream;
        setWebcamVideoReady(false);

        // Wait for metadata to load before playing
        const handleLoadedMetadata = () => {
          video.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Shared webcam video play error:', err);
            }
          });
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          setWebcamVideoReady(true);
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        // Also try to play immediately (in case metadata is already loaded)
        video.play().catch(() => {
          // Ignore - will retry after loadedmetadata
        });
      } else if (video.videoWidth > 0 && video.videoHeight > 0) {
        setWebcamVideoReady(true);
      }
    } else {
      setWebcamVideoReady(false);
      if (sharedWebcamVideoRef.current && !cameraStream) {
        sharedWebcamVideoRef.current.srcObject = null;
      }
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

  useEffect(() => {
    if (videoSource.type !== "webcam") setWebcamVideoReady(false);
  }, [videoSource.type]);

  // Recording & Export state (mova-parque only)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const recordingEngineRef = useRef<ReturnType<typeof startRecording> | null>(null);
  const recordingDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const [exportFrameRate, setExportFrameRate] = useState<ExportFrameRate>(30);
  const [exportQualityPreset, setExportQualityPreset] = useState<ExportQualityPreset>("standard");
  const [signInModalOpen, setSignInModalOpen] = useState(false);

  const { user } = useAuth();
  const canUsePremiumExport = !!user;

  useEffect(() => {
    if (!user) setExportQualityPreset("standard");
  }, [user]);

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
  const poseRecordingSamplesRef = useRef<PoseRecordingSample[]>([]);

  const handleRecordingPoseSample = useCallback((sample: PoseRecordingSample) => {
    appendPoseRecordingSample(poseRecordingSamplesRef.current, sample);
  }, []);

  useEffect(() => {
    poseRecordingSamplesRef.current = [];
  }, [videoSource.objectUrl, videoSource.type]);

  useEffect(() => {
    const v = videoSource.videoElement;
    if (videoSource.type !== "upload" || !v) return;
    const onSeeked = () => {
      poseRecordingSamplesRef.current = [];
    };
    v.addEventListener("seeked", onSeeked);
    return () => v.removeEventListener("seeked", onSeeked);
  }, [videoSource.videoElement, videoSource.type]);

  // Refs for canvas layers (if needed in the future)
  // const bodyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Blob tracking state
  const [blobTracking, setBlobTracking] =
    useState<BlobTrackingConfig>(DEFAULT_BLOB_CONFIG);

  // Depth Anything (Secret Section)
  const [depthAnything, setDepthAnything] = useState({
    enabled: false,
    style: "depthMap" as "depthMap" | "heatmap" | "xray",
    intensity: 0.7,
    depthRange: [0, 1] as [number, number],
  });
  const handleDepthAnythingChange = useCallback(
    (key: string, value: unknown) => {
      setDepthAnything((prev) => {
        if (key === "enabled") return { ...prev, enabled: value as boolean };
        if (key === "style") return { ...prev, style: value as "depthMap" | "heatmap" | "xray" };
        if (key === "intensity") return { ...prev, intensity: value as number };
        if (key === "depthRange") return { ...prev, depthRange: value as [number, number] };
        return prev;
      });
    },
    []
  );

  // Update blob tracking colors when mood changes
  useEffect(() => {
    const colorPreset =
      blobTrackingColorPresets[mood.colorPalette];
    setBlobTracking((prev: BlobTrackingConfig) => ({
      ...prev,
      ...colorPreset,
    }));
  }, [mood.colorPalette]);

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
    setCamera((prev) => ({ ...prev, [key]: value }));
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
      const usePremium = !!user;
      const qualityPreset = usePremium ? exportQualityPreset : "standard";
      const handle = startRecording({
        width: dims.width,
        height: dims.height,
        frameRate: exportFrameRate,
        videoBitsPerSecond: EXPORT_QUALITY_BITRATE[qualityPreset],
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
          showGhostTrails: bodyEffects.showGhostTrails,
          depthEnabled: depthAnything.enabled,
        },
        applyWatermark: !usePremium,
        poseExport:
          source.type === "upload" &&
          source.videoElement &&
          motionAnalysis.enabled &&
          background.kaleidoscope === "none"
            ? {
                getVideoCurrentTime: () => source.videoElement!.currentTime,
                getSamples: () => poseRecordingSamplesRef.current,
                style: {
                  showSkeleton: motionAnalysis.showSkeleton,
                  skeletonColor: motionAnalysis.skeletonColor,
                  skeletonLineWidth: motionAnalysis.skeletonLineWidth,
                  jointSize: motionAnalysis.jointSize,
                  lineStyle: motionAnalysis.lineStyle,
                  showJointAngles: motionAnalysis.showJointAngles,
                  showROM: motionAnalysis.showROM,
                  enabledBones: motionAnalysis.enabledBones,
                  enabledJoints: motionAnalysis.enabledJoints,
                  jointAngleTextSize: motionAnalysis.jointAngleTextSize,
                  jointAngleTextColor: motionAnalysis.jointAngleTextColor,
                  jointAngleBgColor: motionAnalysis.jointAngleBgColor,
                  romTextSize: motionAnalysis.romTextSize,
                  romTextColor: motionAnalysis.romTextColor,
                  romBgColor: motionAnalysis.romBgColor,
                },
                confidenceThreshold: 0.3,
              }
            : null,
      });
      recordingEngineRef.current = handle;
      recordingDimensionsRef.current = { width: dims.width, height: dims.height };
      setIsRecording(true);
      setRecordingStartTime(Date.now());
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [
    user,
    videoSource,
    cameraStream,
    exportFrameRate,
    exportQualityPreset,
    background.kaleidoscope,
    atmosphere.noise,
    camera.showRawVideo,
    camera.rawVideoOpacity,
    bodySegmentation.enabled,
    motionAnalysis.enabled,
    motionAnalysis.showSkeleton,
    motionAnalysis.skeletonColor,
    motionAnalysis.skeletonLineWidth,
    motionAnalysis.jointSize,
    motionAnalysis.lineStyle,
    motionAnalysis.showJointAngles,
    motionAnalysis.showROM,
    motionAnalysis.enabledBones,
    motionAnalysis.enabledJoints,
    motionAnalysis.jointAngleTextSize,
    motionAnalysis.jointAngleTextColor,
    motionAnalysis.jointAngleBgColor,
    motionAnalysis.romTextSize,
    motionAnalysis.romTextColor,
    motionAnalysis.romBgColor,
    blobTracking.enabled,
    bodyEffects.showGhostTrails,
    depthAnything.enabled,
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
      recordingDimensionsRef.current = null;
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
          {/* Grid background layer - Behind body effects */}
          <GridBackgroundLayer
            enabled={gridBackground.enabled}
            config={gridBackground}
            videoSource={
              videoSource.type === "upload"
                ? videoSource.videoElement
                : cameraStream
            }
            isRecording={isRecording}
            recordingDimensionsRef={recordingDimensionsRef}
          />

          {/* Depth Anything layer - base when enabled (replaces raw video) */}
          <DepthLayer
            videoSource={videoSource.type === "upload" ? videoSource.videoElement : null}
            sharedWebcamVideoRef={sharedWebcamVideoRef}
            config={depthAnything}
            hasVideo={
              (videoSource.type === "upload" && videoSource.videoElement != null) ||
              (videoSource.type === "webcam" && cameraStream != null)
            }
            webcamVideoReady={webcamVideoReady}
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
            onRecordingPoseSample={handleRecordingPoseSample}
          />

          {/* Raw video layer - hidden when Depth Anything is on (depth is the base) */}
          {videoSource.type === "upload" && videoSource.videoElement && !depthAnything.enabled && (
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

      <WatermarkLayer
        show={!canUsePremiumExport}
        videoSource={
          videoSource.type === "upload"
            ? videoSource.videoElement
            : cameraStream
        }
      />

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
        onBlobTrackingChange={handleBlobTrackingChange}
        onGridBackgroundChange={handleGridBackgroundChange}
        depthAnything={depthAnything}
        onDepthAnythingChange={handleDepthAnythingChange}
        motionAnalysis={motionAnalysis}
        onMotionAnalysisChange={handleMotionAnalysisChange}
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
        canUsePremiumExport={canUsePremiumExport}
        onRequestSignIn={() => setSignInModalOpen(true)}
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

      <SignInModal
        open={signInModalOpen}
        onOpenChange={setSignInModalOpen}
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
      {/* Hidden when Depth Anything is on (depth layer is the base instead) */}
      {cameraStream && (
        <video
          ref={sharedWebcamVideoRef}
          className="pointer-events-none z-[2]"
          style={{
            visibility: camera.showRawVideo && !depthAnything.enabled ? 'visible' : 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover', // Fill screen, crop edges if needed (matches body segmentation behavior)
            opacity: camera.showRawVideo && !depthAnything.enabled ? camera.rawVideoOpacity : 0,
          }}
          playsInline
          muted
          autoPlay
        />
      )}
    </div>
  );
}