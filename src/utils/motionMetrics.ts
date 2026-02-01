import { PoseFrame, Keypoint, calculateAngle, POSE_LANDMARKS } from './poseTracking';

export interface JointAngle {
  jointName: string;  // 'left_knee', 'right_hip', etc.
  angle: number;       // degrees
  confidence: number;  // 0-1
  position: { x: number; y: number };  // Joint position for overlay
}

export interface ROMData {
  jointName: string;
  currentAngle: number;
  minAngle: number;
  maxAngle: number;
  range: number;  // max - min
}

export interface SymmetryData {
  metric: string;  // 'knee_flexion', 'hip_extension', etc.
  left: number;
  right: number;
  difference: number;  // absolute difference
  symmetryScore: number;  // 0-100, higher = more symmetric
}

export interface VelocityData {
  keypoint: string;
  velocity: number;  // pixels per frame
  timestamp: number;
}

export interface MetricsSnapshot {
  jointAngles: JointAngle[];
  rom: ROMData[];
  symmetry: SymmetryData[];
  velocity: VelocityData[];
  timestamp: number;
}

export class BasicMotionMetricsEngine {
  private poseHistory: PoseFrame[] = [];
  private romStorage = new Map<string, { min: number; max: number; history: number[] }>();
  private maxHistorySize: number = 300; // ~10 seconds at 30fps
  
  // Joint angle definitions (from review doc)
  private jointDefinitions = [
    {
      name: 'left_knee',
      points: [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
    },
    {
      name: 'right_knee',
      points: [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
    },
    {
      name: 'left_hip',
      points: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
    },
    {
      name: 'right_hip',
      points: [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
    },
    {
      name: 'left_elbow',
      points: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
    },
    {
      name: 'right_elbow',
      points: [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
    },
  ];
  
  calculateJointAngles(pose: PoseFrame): JointAngle[] {
    const angles: JointAngle[] = [];
    
    for (const def of this.jointDefinitions) {
      const [aIdx, bIdx, cIdx] = def.points;
      const a = pose.keypoints[aIdx];
      const b = pose.keypoints[bIdx];
      const c = pose.keypoints[cIdx];
      
      if (!a || !b || !c || a.score < 0.3 || b.score < 0.3 || c.score < 0.3) {
        continue;  // Skip if low confidence
      }
      
      const { angle, confidence } = calculateAngle(a, b, c);
      angles.push({
        jointName: def.name,
        angle: Math.round(angle),
        confidence,
        position: { x: b.x, y: b.y },  // Joint position for overlay
      });
    }
    
    return angles;
  }
  
  updateROMTracking(jointAngles: JointAngle[]): ROMData[] {
    const romData: ROMData[] = [];
    
    for (const joint of jointAngles) {
      const key = joint.jointName;
      
      if (!this.romStorage.has(key)) {
        this.romStorage.set(key, {
          min: joint.angle,
          max: joint.angle,
          history: [joint.angle]
        });
      }
      
      const stored = this.romStorage.get(key)!;
      stored.min = Math.min(stored.min, joint.angle);
      stored.max = Math.max(stored.max, joint.angle);
      stored.history.push(joint.angle);
      
      // Keep only last 100 measurements (from review doc)
      if (stored.history.length > 100) {
        stored.history = stored.history.slice(-100);
      }
      
      romData.push({
        jointName: key,
        currentAngle: joint.angle,
        minAngle: stored.min,
        maxAngle: stored.max,
        range: stored.max - stored.min,
      });
    }
    
    return romData;
  }
  
  calculateSymmetry(currentPose: PoseFrame): SymmetryData[] {
    const symmetry: SymmetryData[] = [];
    const jointAngles = this.calculateJointAngles(currentPose);
    
    // Compare left/right pairs
    const pairs = [
      { left: 'left_knee', right: 'right_knee', metric: 'knee_flexion' },
      { left: 'left_hip', right: 'right_hip', metric: 'hip_flexion' },
      { left: 'left_elbow', right: 'right_elbow', metric: 'elbow_flexion' },
    ];
    
    for (const pair of pairs) {
      const leftAngle = jointAngles.find(j => j.jointName === pair.left);
      const rightAngle = jointAngles.find(j => j.jointName === pair.right);
      
      if (leftAngle && rightAngle) {
        const difference = Math.abs(leftAngle.angle - rightAngle.angle);
        // Symmetry score: 100 = perfect symmetry, 0 = 180° difference
        const symmetryScore = Math.max(0, 100 - (difference / 180) * 100);
        
        symmetry.push({
          metric: pair.metric,
          left: leftAngle.angle,
          right: rightAngle.angle,
          difference,
          symmetryScore: Math.round(symmetryScore),
        });
      }
    }
    
    return symmetry;
  }
  
  calculateVelocity(currentPose: PoseFrame, previousPose: PoseFrame | null): VelocityData[] {
    if (!previousPose) return [];
    
    const velocity: VelocityData[] = [];
    const timeDelta = currentPose.timestamp - previousPose.timestamp;
    
    if (timeDelta <= 0) return [];
    
    // Calculate velocity for major joints
    const majorJoints = [
      { name: 'left_wrist', idx: POSE_LANDMARKS.LEFT_WRIST },
      { name: 'right_wrist', idx: POSE_LANDMARKS.RIGHT_WRIST },
      { name: 'left_ankle', idx: POSE_LANDMARKS.LEFT_ANKLE },
      { name: 'right_ankle', idx: POSE_LANDMARKS.RIGHT_ANKLE },
    ];
    
    for (const joint of majorJoints) {
      const current = currentPose.keypoints[joint.idx];
      const previous = previousPose.keypoints[joint.idx];
      
      if (current && previous && current.score > 0.3 && previous.score > 0.3) {
        const distance = Math.sqrt(
          Math.pow(current.x - previous.x, 2) + 
          Math.pow(current.y - previous.y, 2)
        );
        const velocityPixelsPerFrame = distance / timeDelta;
        
        velocity.push({
          keypoint: joint.name,
          velocity: velocityPixelsPerFrame,
          timestamp: currentPose.timestamp,
        });
      }
    }
    
    return velocity;
  }
  
  processFrame(pose: PoseFrame): MetricsSnapshot {
    // Add to history
    this.poseHistory.push(pose);
    if (this.poseHistory.length > this.maxHistorySize) {
      this.poseHistory.shift();
    }
    
    const previousPose = this.poseHistory.length > 1 
      ? this.poseHistory[this.poseHistory.length - 2] 
      : null;
    
    // Calculate all metrics
    const jointAngles = this.calculateJointAngles(pose);
    const rom = this.updateROMTracking(jointAngles);
    const symmetry = this.calculateSymmetry(pose);
    const velocity = this.calculateVelocity(pose, previousPose);
    
    return {
      jointAngles,
      rom,
      symmetry,
      velocity,
      timestamp: pose.timestamp,
    };
  }
  
  reset(): void {
    this.poseHistory = [];
    this.romStorage.clear();
  }
}
