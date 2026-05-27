import { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import { BasicMotionMetricsEngine, MetricsSnapshot } from '@/utils/motionMetrics';
import { drawPoseOverlayOnContext } from '@/utils/drawPoseOverlay';
import { PoseFrame, Keypoint, smoothKeypoints } from '@/utils/poseTracking';
import type { PoseRecordingSample } from '@/app/recording/types';

interface PoseEstimationLayerProps {
  enabled: boolean;
  videoSource?: HTMLVideoElement | null;
  onPoseData?: (pose: PoseFrame) => void;
  onMetricsData?: (metrics: MetricsSnapshot) => void;
  showSkeleton?: boolean;
  skeletonColor?: string;
  skeletonLineWidth?: number;
  jointSize?: number;
  confidenceThreshold?: number;
  lineStyle?: 'solid' | 'dashed';
  showJointAngles?: boolean;
  showROM?: boolean;
  enabledBones?: boolean[];
  enabledJoints?: boolean[];
  metrics?: MetricsSnapshot | null;
  jointAngleTextSize?: number;
  jointAngleTextColor?: string;
  jointAngleBgColor?: string;
  romTextSize?: number;
  romTextColor?: string;
  romBgColor?: string;
  /** Samples for time-interpolated pose during export (upload + currentTime). */
  onRecordingPoseSample?: (sample: PoseRecordingSample) => void;
}

export function PoseEstimationLayer({
  enabled,
  videoSource,
  onPoseData,
  onMetricsData,
  showSkeleton = true,
  skeletonColor = '#00ff00',
  skeletonLineWidth = 2,
  jointSize = 4,
  confidenceThreshold = 0.3,
  lineStyle = 'solid',
  showJointAngles = false,
  showROM = false,
  enabledBones = Array(12).fill(true),
  enabledJoints = Array(17).fill(true),
  metrics = null,
  jointAngleTextSize = 14,
  jointAngleTextColor = '#00ff00',
  jointAngleBgColor = '#000000',
  romTextSize = 10,
  romTextColor = '#00ff00',
  romBgColor = '#000000',
  onRecordingPoseSample,
}: PoseEstimationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const metricsEngineRef = useRef(new BasicMotionMetricsEngine());
  const previousKeypointsRef = useRef<Keypoint[]>([]);
  const lastVideoTimeRef = useRef<number>(-1);
  const isProcessingRef = useRef<boolean>(false);
  const onRecordingPoseSampleRef = useRef(onRecordingPoseSample);
  // Refs for style props to avoid stale closures
  const skeletonColorRef = useRef(skeletonColor);
  const skeletonLineWidthRef = useRef(skeletonLineWidth);
  const jointSizeRef = useRef(jointSize);
  const lineStyleRef = useRef(lineStyle);
  const showJointAnglesRef = useRef(showJointAngles);
  const showROMRef = useRef(showROM);
  const enabledBonesRef = useRef(enabledBones);
  const enabledJointsRef = useRef(enabledJoints);
  const jointAngleTextSizeRef = useRef(jointAngleTextSize);
  const jointAngleTextColorRef = useRef(jointAngleTextColor);
  const jointAngleBgColorRef = useRef(jointAngleBgColor);
  const romTextSizeRef = useRef(romTextSize);
  const romTextColorRef = useRef(romTextColor);
  const romBgColorRef = useRef(romBgColor);
  
  // Update refs when props change
  useEffect(() => {
    skeletonColorRef.current = skeletonColor;
    skeletonLineWidthRef.current = skeletonLineWidth;
    jointSizeRef.current = jointSize;
    lineStyleRef.current = lineStyle;
    showJointAnglesRef.current = showJointAngles;
    showROMRef.current = showROM;
    enabledBonesRef.current = enabledBones;
    enabledJointsRef.current = enabledJoints;
    jointAngleTextSizeRef.current = jointAngleTextSize;
    jointAngleTextColorRef.current = jointAngleTextColor;
    jointAngleBgColorRef.current = jointAngleBgColor;
    romTextSizeRef.current = romTextSize;
    romTextColorRef.current = romTextColor;
    romBgColorRef.current = romBgColor;
  }, [skeletonColor, skeletonLineWidth, jointSize, lineStyle, showJointAngles, showROM, enabledBones, enabledJoints, jointAngleTextSize, jointAngleTextColor, jointAngleBgColor, romTextSize, romTextColor, romBgColor]);

  useEffect(() => {
    onRecordingPoseSampleRef.current = onRecordingPoseSample;
  }, [onRecordingPoseSample]);

  // Clear canvas only when no pose overlay is enabled
  useEffect(() => {
    if (!showSkeleton && !showJointAngles && !showROM && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    // Render loop will handle drawing when enabled
  }, [showSkeleton]);
  
  // Load model (following review doc pattern)
  useEffect(() => {
    if (!enabled) return;
    
    async function loadModel() {
      try {
        await tf.ready();
        console.log('TensorFlow.js backend:', tf.getBackend());
        
        // Use MoveNet SINGLEPOSE_LIGHTNING (from review doc)
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );
        
        detectorRef.current = detector;
        setIsLoading(false);
        console.log('Pose detection model loaded');
      } catch (err) {
        setError('Failed to load pose detection model');
        console.error('Model loading error:', err);
        setIsLoading(false);
      }
    }
    
    loadModel();
  }, [enabled]);
  
  // Setup video source (only for uploaded videos)
  useEffect(() => {
    if (!enabled || isLoading || !detectorRef.current || !videoSource) return;
    
    let animationId: number;
    
    async function setupVideoSource() {
      if (!videoSource) return;
      
      try {
        if (videoSource.paused) {
          await videoSource.play();
        }
        
        // Process frames (following BodySegmentationLayer's video sync pattern)
        const processVideoFrame = async () => {
          if (!detectorRef.current || !videoSource || !canvasRef.current) return;
          
          const video = videoSource;
          
          // Sync with video playback (like BodySegmentationLayer)
          const currentVideoTime = video.currentTime;
          const timeDelta = Math.abs(currentVideoTime - lastVideoTimeRef.current);
          
          // Skip if we're already processing or if video hasn't advanced enough
          if (isProcessingRef.current || timeDelta < 0.01) {
            animationId = requestAnimationFrame(processVideoFrame);
            return;
          }
          
          lastVideoTimeRef.current = currentVideoTime;
          isProcessingRef.current = true;
          
          try {
            const poses = await detectorRef.current.estimatePoses(video);
            const pose = poses[0] || null;
            
            if (pose) {
              await processPose(pose);
            }
            // No pose detected - render loop will keep previous skeleton visible
          } catch (err) {
            console.error('Pose detection error:', err);
          }
          
          isProcessingRef.current = false;
          animationId = requestAnimationFrame(processVideoFrame);
        };
        
        processVideoFrame();
      } catch (err) {
        setError('Failed to setup video source');
        console.error('Video setup error:', err);
      }
    }
    
    setupVideoSource();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [enabled, isLoading, videoSource, detectorRef.current]);

  // Separate render loop - smooth 60fps rendering independent of pose detection timing
  useEffect(() => {
    const shouldRenderOverlay = showSkeleton || showJointAngles || showROM;
    if (!enabled || !shouldRenderOverlay || !canvasRef.current) return;
    
    let renderAnimationId: number;
    
    const renderLoop = () => {
      if (!canvasRef.current || previousKeypointsRef.current.length === 0) {
        renderAnimationId = requestAnimationFrame(renderLoop);
        return;
      }
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || canvas.width === 0 || canvas.height === 0) {
        renderAnimationId = requestAnimationFrame(renderLoop);
        return;
      }
      
      // Always draw the latest skeleton - smooth 60fps rendering
      // This is independent of pose detection timing
      const currentMetrics = metrics || undefined;
      drawPoseOverlayOnContext(
        ctx,
        canvas.width,
        canvas.height,
        previousKeypointsRef.current,
        currentMetrics,
        {
          showSkeleton,
          skeletonColor: skeletonColorRef.current,
          skeletonLineWidth: skeletonLineWidthRef.current,
          jointSize: jointSizeRef.current,
          lineStyle: lineStyleRef.current,
          showJointAngles: showJointAnglesRef.current,
          showROM: showROMRef.current,
          enabledBones: enabledBonesRef.current,
          enabledJoints: enabledJointsRef.current,
          jointAngleTextSize: jointAngleTextSizeRef.current,
          jointAngleTextColor: jointAngleTextColorRef.current,
          jointAngleBgColor: jointAngleBgColorRef.current,
          romTextSize: romTextSizeRef.current,
          romTextColor: romTextColorRef.current,
          romBgColor: romBgColorRef.current,
        },
        { confidenceThreshold, clearFullCanvas: true }
      );
      
      renderAnimationId = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
    
    return () => {
      if (renderAnimationId) cancelAnimationFrame(renderAnimationId);
    };
  }, [enabled, showSkeleton, showJointAngles, showROM, metrics, confidenceThreshold]);
  
  // Process pose and calculate metrics
  async function processPose(pose: poseDetection.Pose) {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Convert to PoseFrame format
    const keypoints: Keypoint[] = pose.keypoints.map((kp, idx) => ({
      x: kp.x,
      y: kp.y,
      score: kp.score || 0,
      name: `keypoint_${idx}`,
    }));
    
    // Smooth keypoints with minimal smoothing for maximum responsiveness
    // Lower value = more responsive (less lag), higher value = smoother (more lag)
    const smoothedKeypoints = smoothKeypoints(keypoints, previousKeypointsRef.current, 0.1);
    
    // Update previousKeypointsRef immediately - render loop will pick it up
    previousKeypointsRef.current = smoothedKeypoints;
    
    const poseFrame: PoseFrame = {
      keypoints: smoothedKeypoints,
      timestamp: Date.now(),
      frameNumber: Date.now(),
      score: pose.score,
    };
    
    // Calculate metrics
    const calculatedMetrics = metricsEngineRef.current.processFrame(poseFrame);
    
    // Emit data
    if (onPoseData) onPoseData(poseFrame);
    if (onMetricsData) onMetricsData(calculatedMetrics);

    const recordCb = onRecordingPoseSampleRef.current;
    if (recordCb && videoSource) {
      recordCb({
        videoTime: videoSource.currentTime,
        keypoints: smoothedKeypoints.map((k) => ({ ...k })),
        metrics: JSON.parse(JSON.stringify(calculatedMetrics)) as MetricsSnapshot,
      });
    }

    // Clear canvas when no pose overlay is enabled
    if (!showSkeleton && !showJointAnglesRef.current && !showROMRef.current) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  
  // Setup canvas with proper resolution
  useEffect(() => {
    if (!enabled || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const resize = () => {
      const viewportHeight = document.documentElement.clientHeight;
      const viewportWidth = document.documentElement.clientWidth;

      // Internal resolution stays in video pixel space for accurate keypoint plotting.
      const videoWidth = videoSource?.videoWidth || 640;
      const videoHeight = videoSource?.videoHeight || 480;
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      let displayWidth: number;
      let displayHeight: number;
      let shouldCenter = false;

      if (videoSource && videoSource.videoWidth > 0 && videoSource.videoHeight > 0) {
        // Match BodySegmentationLayer/RawVideoLayer upload behavior:
        // full viewport height, width derived from video aspect, centered horizontally.
        const videoAspect = videoSource.videoWidth / videoSource.videoHeight;
        displayHeight = viewportHeight;
        displayWidth = displayHeight * videoAspect;
        shouldCenter = true;
      } else {
        // Fallback (metadata not ready): webcam-like full viewport sizing.
        displayWidth = viewportWidth;
        displayHeight = viewportHeight;
      }

      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      if (shouldCenter) {
        canvas.style.left = '50%';
        canvas.style.transform = 'translateX(-50%)';
      } else {
        canvas.style.left = '0';
        canvas.style.transform = 'none';
      }
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    // Also resize when video metadata loads
    if (videoSource) {
      videoSource.addEventListener('loadedmetadata', resize);
    }
    
    return () => {
      window.removeEventListener('resize', resize);
      if (videoSource) {
        videoSource.removeEventListener('loadedmetadata', resize);
      }
    };
  }, [enabled, videoSource, showSkeleton, metrics]);
  
  if (!enabled || isLoading || error) {
    return null;
  }
  
  return (
    <canvas
      ref={canvasRef}
      className="pose-estimation-layer pose-estimation-canvas fixed inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 6, // Above body effects container (z-[5])
      }}
    />
  );
}
