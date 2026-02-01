import { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import { BasicMotionMetricsEngine, MetricsSnapshot } from '@/utils/motionMetrics';
import { PoseFrame, Keypoint, BONE_CONNECTIONS, smoothKeypoints } from '@/utils/poseTracking';

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
}: PoseEstimationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const metricsEngineRef = useRef(new BasicMotionMetricsEngine());
  const previousKeypointsRef = useRef<Keypoint[]>([]);
  const lastVideoTimeRef = useRef<number>(-1);
  const isProcessingRef = useRef<boolean>(false);
  const lastDrawnKeypointsRef = useRef<Keypoint[]>([]); // Track what's currently drawn
  
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

  // Clear canvas when skeleton is disabled
  useEffect(() => {
    if (!showSkeleton && canvasRef.current) {
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
    if (!enabled || !showSkeleton || !canvasRef.current) return;
    
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
      drawSkeleton(ctx, canvas, previousKeypointsRef.current, currentMetrics, true);
      
      renderAnimationId = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
    
    return () => {
      if (renderAnimationId) cancelAnimationFrame(renderAnimationId);
    };
  }, [enabled, showSkeleton, metrics]);
  
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
    const smoothedKeypoints = smoothKeypoints(keypoints, previousKeypointsRef.current, 0.2);
    
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
    
    // Clear canvas if skeleton is disabled
    if (!showSkeleton) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  
  // Draw skeleton (following review doc patterns)
  function drawSkeleton(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    keypoints: Keypoint[],
    currentMetrics?: MetricsSnapshot,
    forceClear: boolean = true
  ) {
    // Check if we have any valid keypoints to draw
    const hasValidKeypoints = keypoints.some(kp => kp.score > confidenceThreshold);
    
    // If no valid keypoints, don't draw anything
    // If forceClear is true, clear the canvas to show nothing
    // If forceClear is false, keep previous skeleton (don't clear, don't draw)
    if (!hasValidKeypoints) {
      if (forceClear) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        lastDrawnKeypointsRef.current = [];
      }
      return;
    }
    
    // We have valid keypoints - always clear and redraw to ensure clean rendering
    // This prevents double-drawing artifacts and ensures skeleton stays visible
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update what we've drawn
    lastDrawnKeypointsRef.current = keypoints.map(kp => ({ ...kp }));
    
    // MoveNet returns coordinates in the input video's pixel coordinate space
    // Canvas internal resolution is set to match video resolution (videoWidth x videoHeight)
    // So we can use 1:1 mapping - keypoints are already in the correct coordinate space
    const scaleX = 1;
    const scaleY = 1;
    const offsetX = 0;
    const offsetY = 0;
    
    // Draw bones
    ctx.strokeStyle = skeletonColorRef.current;
    ctx.lineWidth = skeletonLineWidthRef.current;
    
    // Set line style
    if (lineStyleRef.current === 'dashed') {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }
    
    BONE_CONNECTIONS.forEach(([start, end], boneIndex) => {
      // Check if this bone is enabled
      if (enabledBonesRef.current && !enabledBonesRef.current[boneIndex]) return;
      
      const startPoint = keypoints[start];
      const endPoint = keypoints[end];
      
      if (startPoint && endPoint && 
          startPoint.score > confidenceThreshold && 
          endPoint.score > confidenceThreshold) {
        ctx.beginPath();
        ctx.moveTo(
          startPoint.x * scaleX + offsetX,
          startPoint.y * scaleY + offsetY
        );
        ctx.lineTo(
          endPoint.x * scaleX + offsetX,
          endPoint.y * scaleY + offsetY
        );
        ctx.stroke();
      }
    });
    
    // Reset line dash
    ctx.setLineDash([]);
    
    // Draw joints (skip face landmarks: indices 0-4)
    ctx.fillStyle = skeletonColorRef.current;
    keypoints.forEach((keypoint, jointIndex) => {
      // Skip face landmarks (nose, eyes, ears) - indices 0-4
      if (jointIndex < 5) return;
      
      // Check if this joint is enabled
      if (enabledJointsRef.current && !enabledJointsRef.current[jointIndex]) return;
      
      if (keypoint.score > confidenceThreshold) {
        const x = keypoint.x * scaleX + offsetX;
        const y = keypoint.y * scaleY + offsetY;
        
        ctx.beginPath();
        ctx.arc(x, y, jointSizeRef.current, 0, 2 * Math.PI);
        ctx.fill();
        
        // Determine if joint is on left or right side for "outside" positioning
        // Left joints: 7 (left_elbow), 9 (left_wrist), 11 (left_hip), 13 (left_knee), 15 (left_ankle)
        // Right joints: 8 (right_elbow), 10 (right_wrist), 12 (right_hip), 14 (right_knee), 16 (right_ankle)
        const leftJoints = [7, 9, 11, 13, 15];
        const rightJoints = [8, 10, 12, 14, 16];
        const isLeftJoint = leftJoints.includes(jointIndex);
        const isRightJoint = rightJoints.includes(jointIndex);
        
        // Draw joint angle if enabled and metrics available
        if (showJointAnglesRef.current && currentMetrics) {
          const jointAngle = currentMetrics.jointAngles.find(ja => {
            // Map joint index to joint name (simplified mapping)
            const jointNames: { [key: number]: string } = {
              13: 'left_knee',
              14: 'right_knee',
              11: 'left_hip',
              12: 'right_hip',
              7: 'left_elbow',
              8: 'right_elbow',
            };
            return ja.jointName === jointNames[jointIndex];
          });
          
          if (jointAngle) {
            const text = `${jointAngle.angle}°`;
            ctx.font = `bold ${jointAngleTextSizeRef.current}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Measure text for background
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = jointAngleTextSizeRef.current;
            const padding = 4;
            const bgWidth = textWidth + padding * 2;
            const bgHeight = textHeight + padding * 2;
            
            // Position on the outside of the joint
            // From viewer's perspective: person's left side is on viewer's right (higher X)
            // So left joints should have text on the RIGHT (positive X) to be outside
            // And right joints should have text on the LEFT (negative X) to be outside
            let textX: number;
            if (isLeftJoint) {
              // Left joints: position to the RIGHT (outside, away from body center from viewer's perspective)
              textX = x + jointSizeRef.current + bgWidth / 2 + 8;
            } else if (isRightJoint) {
              // Right joints: position to the LEFT (outside, away from body center from viewer's perspective)
              textX = x - jointSizeRef.current - bgWidth / 2 - 8;
            } else {
              // Default to right for other joints
              textX = x + jointSizeRef.current + bgWidth / 2 + 8;
            }
            const textY = y;
            
            // Draw background
            ctx.fillStyle = jointAngleBgColorRef.current;
            ctx.fillRect(
              textX - bgWidth / 2,
              textY - bgHeight / 2,
              bgWidth,
              bgHeight
            );
            
            // Draw text
            ctx.fillStyle = jointAngleTextColorRef.current;
            ctx.fillText(text, textX, textY);
          }
        }
        
        // Draw ROM if enabled and metrics available
        if (showROMRef.current && currentMetrics) {
          const romData = currentMetrics.rom.find(r => {
            const jointNames: { [key: number]: string } = {
              13: 'left_knee',
              14: 'right_knee',
              11: 'left_hip',
              12: 'right_hip',
              7: 'left_elbow',
              8: 'right_elbow',
            };
            return r.jointName === jointNames[jointIndex];
          });
          
          if (romData) {
            const text = `ROM: ${romData.range}°`;
            ctx.font = `${romTextSizeRef.current}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Measure text for background
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = romTextSizeRef.current;
            const padding = 4;
            const bgWidth = textWidth + padding * 2;
            const bgHeight = textHeight + padding * 2;
            
            // Position on the outside of the joint
            // From viewer's perspective: person's left side is on viewer's right (higher X)
            // So left joints should have text on the RIGHT (positive X) to be outside
            // And right joints should have text on the LEFT (negative X) to be outside
            let textX: number;
            if (isLeftJoint) {
              // Left joints: position to the RIGHT (outside, away from body center from viewer's perspective), below
              textX = x + jointSizeRef.current + bgWidth / 2 + 8;
            } else if (isRightJoint) {
              // Right joints: position to the LEFT (outside, away from body center from viewer's perspective), below
              textX = x - jointSizeRef.current - bgWidth / 2 - 8;
            } else {
              // Default to right for other joints
              textX = x + jointSizeRef.current + bgWidth / 2 + 8;
            }
            const textY = y + jointSizeRef.current + bgHeight / 2 + 8;
            
            // Draw background
            ctx.fillStyle = romBgColorRef.current;
            ctx.fillRect(
              textX - bgWidth / 2,
              textY - bgHeight / 2,
              bgWidth,
              bgHeight
            );
            
            // Draw text
            ctx.fillStyle = romTextColorRef.current;
            ctx.fillText(text, textX, textY);
          }
        }
      }
    });
  }
  
  // Setup canvas with proper resolution
  useEffect(() => {
    if (!enabled || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const resize = () => {
      const viewportHeight = document.documentElement.clientHeight;
      const viewportWidth = document.documentElement.clientWidth;
      
      // Get video dimensions for internal canvas resolution
      let videoWidth = 640;
      let videoHeight = 480;
      let shouldCenter = false;
      
      if (videoSource) {
        videoWidth = videoSource.videoWidth || 640;
        videoHeight = videoSource.videoHeight || 480;
        
        if (videoWidth > 0 && videoHeight > 0) {
          shouldCenter = true;
        }
      }
      
      // Set internal canvas resolution to match video (for crisp rendering)
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      // Calculate display size based on viewport and aspect ratio
      const videoAspect = videoWidth / videoHeight;
      const viewportAspect = viewportWidth / viewportHeight;
      
      let displayWidth: number;
      let displayHeight: number;
      
      if (videoAspect > viewportAspect) {
        // Video is wider - fit to width
        displayWidth = viewportWidth;
        displayHeight = viewportWidth / videoAspect;
      } else {
        // Video is taller - fit to height
        displayHeight = viewportHeight;
        displayWidth = viewportHeight * videoAspect;
      }
      
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      if (shouldCenter) {
        canvas.style.left = '50%';
        canvas.style.transform = 'translateX(-50%)';
      } else {
        canvas.style.left = '0';
        canvas.style.transform = 'none';
      }
      
      // Render loop will handle redrawing - no need to draw here on resize
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
