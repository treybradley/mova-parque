import type { MetricsSnapshot } from "@/utils/motionMetrics";
import type { Keypoint } from "@/utils/poseTracking";
import { BONE_CONNECTIONS } from "@/utils/poseTracking";

export interface PoseOverlayDrawStyle {
  showSkeleton: boolean;
  skeletonColor: string;
  skeletonLineWidth: number;
  jointSize: number;
  lineStyle: "solid" | "dashed";
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
}

const JOINT_INDEX_TO_NAME: Record<number, string> = {
  13: "left_knee",
  14: "right_knee",
  11: "left_hip",
  12: "right_hip",
  7: "left_elbow",
  8: "right_elbow",
};

/**
 * Draw skeleton, joint angle labels, and ROM labels in video pixel space.
 * When `clearFullCanvas` is true (pose layer canvas), clears before draw.
 * When false (recording composite), only draws strokes/fills — never clears the destination.
 */
export function drawPoseOverlayOnContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  keypoints: Keypoint[],
  currentMetrics: MetricsSnapshot | undefined,
  style: PoseOverlayDrawStyle,
  opts: { confidenceThreshold: number; clearFullCanvas: boolean }
): void {
  const { confidenceThreshold, clearFullCanvas } = opts;

  if (!style.showSkeleton) {
    if (clearFullCanvas) {
      ctx.clearRect(0, 0, width, height);
    }
    return;
  }

  const hasValidKeypoints = keypoints.some((kp) => kp.score > confidenceThreshold);

  if (!hasValidKeypoints) {
    if (clearFullCanvas) {
      ctx.clearRect(0, 0, width, height);
    }
    return;
  }

  if (clearFullCanvas) {
    ctx.clearRect(0, 0, width, height);
  }

  const scaleX = 1;
  const scaleY = 1;
  const offsetX = 0;
  const offsetY = 0;

  ctx.strokeStyle = style.skeletonColor;
  ctx.lineWidth = style.skeletonLineWidth;

  if (style.lineStyle === "dashed") {
    ctx.setLineDash([5, 5]);
  } else {
    ctx.setLineDash([]);
  }

  BONE_CONNECTIONS.forEach(([start, end], boneIndex) => {
    if (style.enabledBones && !style.enabledBones[boneIndex]) return;

    const startPoint = keypoints[start];
    const endPoint = keypoints[end];

    if (
      startPoint &&
      endPoint &&
      startPoint.score > confidenceThreshold &&
      endPoint.score > confidenceThreshold
    ) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x * scaleX + offsetX, startPoint.y * scaleY + offsetY);
      ctx.lineTo(endPoint.x * scaleX + offsetX, endPoint.y * scaleY + offsetY);
      ctx.stroke();
    }
  });

  ctx.setLineDash([]);

  ctx.fillStyle = style.skeletonColor;
  const leftJoints = [7, 9, 11, 13, 15];
  const rightJoints = [8, 10, 12, 14, 16];

  keypoints.forEach((keypoint, jointIndex) => {
    if (jointIndex < 5) return;
    if (style.enabledJoints && !style.enabledJoints[jointIndex]) return;

    if (keypoint.score > confidenceThreshold) {
      const x = keypoint.x * scaleX + offsetX;
      const y = keypoint.y * scaleY + offsetY;

      ctx.beginPath();
      ctx.arc(x, y, style.jointSize, 0, 2 * Math.PI);
      ctx.fill();

      const isLeftJoint = leftJoints.includes(jointIndex);
      const isRightJoint = rightJoints.includes(jointIndex);
      const jointName = JOINT_INDEX_TO_NAME[jointIndex];

      if (style.showJointAngles && currentMetrics && jointName) {
        const jointAngle = currentMetrics.jointAngles.find(
          (ja) => ja.jointName === jointName
        );
        if (jointAngle) {
          const text = `${jointAngle.angle}°`;
          ctx.font = `bold ${style.jointAngleTextSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const textMetrics = ctx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = style.jointAngleTextSize;
          const padding = 4;
          const bgWidth = textWidth + padding * 2;
          const bgHeight = textHeight + padding * 2;

          let textX: number;
          if (isLeftJoint) {
            textX = x + style.jointSize + bgWidth / 2 + 8;
          } else if (isRightJoint) {
            textX = x - style.jointSize - bgWidth / 2 - 8;
          } else {
            textX = x + style.jointSize + bgWidth / 2 + 8;
          }
          const textY = y;

          ctx.fillStyle = style.jointAngleBgColor;
          ctx.fillRect(textX - bgWidth / 2, textY - bgHeight / 2, bgWidth, bgHeight);
          ctx.fillStyle = style.jointAngleTextColor;
          ctx.fillText(text, textX, textY);
        }
      }

      if (style.showROM && currentMetrics && jointName) {
        const romData = currentMetrics.rom.find((r) => r.jointName === jointName);
        if (romData) {
          const text = `ROM: ${romData.range}°`;
          ctx.font = `${style.romTextSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const textMetrics = ctx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = style.romTextSize;
          const padding = 4;
          const bgWidth = textWidth + padding * 2;
          const bgHeight = textHeight + padding * 2;

          let textX: number;
          if (isLeftJoint) {
            textX = x + style.jointSize + bgWidth / 2 + 8;
          } else if (isRightJoint) {
            textX = x - style.jointSize - bgWidth / 2 - 8;
          } else {
            textX = x + style.jointSize + bgWidth / 2 + 8;
          }
          const textY = y + style.jointSize + bgHeight / 2 + 8;

          ctx.fillStyle = style.romBgColor;
          ctx.fillRect(textX - bgWidth / 2, textY - bgHeight / 2, bgWidth, bgHeight);
          ctx.fillStyle = style.romTextColor;
          ctx.fillText(text, textX, textY);
        }
      }

      ctx.fillStyle = style.skeletonColor;
    }
  });
}
