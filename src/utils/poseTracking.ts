// COCO-17 Keypoint Format (from review doc)
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
};

// Bone connections (from review doc)
export const BONE_CONNECTIONS = [
  [5, 7], [7, 9],        // Left arm
  [6, 8], [8, 10],       // Right arm
  [11, 13], [13, 15],    // Left leg
  [12, 14], [14, 16],    // Right leg
  [5, 6],                // Shoulders
  [11, 12],              // Hips
  [5, 11],               // Left torso
  [6, 12],               // Right torso
];

export interface Keypoint {
  x: number;
  y: number;
  score: number;  // Confidence (0-1)
  name?: string;
}

export interface PoseFrame {
  keypoints: Keypoint[];
  timestamp: number;
  frameNumber: number;
  score?: number;  // Overall pose confidence
}

// Helper functions (from review doc patterns)
export function calculateAngle(
  a: Keypoint,
  b: Keypoint,  // Vertex point
  c: Keypoint
): { angle: number; confidence: number } {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - 
                  Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  
  const confidence = (a.score + b.score + c.score) / 3;
  return { angle, confidence };
}

export function calculateDistance(p1: Keypoint, p2: Keypoint): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function smoothKeypoints(
  keypoints: Keypoint[],
  previousKeypoints: Keypoint[],
  smoothing: number = .5
): Keypoint[] {
  if (!previousKeypoints || previousKeypoints.length === 0) return keypoints;
  
  return keypoints.map((kp, idx) => {
    const prev = previousKeypoints[idx];
    if (!prev) return kp;
    
    return {
      ...kp,
      x: kp.x * (1 - smoothing) + prev.x * smoothing,
      y: kp.y * (1 - smoothing) + prev.y * smoothing,
      score: kp.score * (1 - smoothing) + prev.score * smoothing,
    };
  });
}
