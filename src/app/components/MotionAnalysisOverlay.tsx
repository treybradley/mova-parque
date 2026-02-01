import { MetricsSnapshot } from '@/utils/motionMetrics';

interface MotionAnalysisOverlayProps {
  enabled: boolean;
  metrics: MetricsSnapshot | null;
  metricsHistory?: MetricsSnapshot[];
  enabledMetricsJoints?: {
    left_knee: boolean;
    right_knee: boolean;
    left_hip: boolean;
    right_hip: boolean;
    left_elbow: boolean;
    right_elbow: boolean;
  };
}

export function MotionAnalysisOverlay({
  enabled,
  metrics,
}: MotionAnalysisOverlayProps) {
  // Component kept for future overlay features, but currently returns null
  if (!enabled || !metrics) return null;

  return null;
}
