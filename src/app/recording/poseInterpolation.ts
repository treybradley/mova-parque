import type { MetricsSnapshot } from "@/utils/motionMetrics";
import type { Keypoint } from "@/utils/poseTracking";
import type { PoseRecordingSample } from "./types";

export type { PoseRecordingSample };

function cloneMetrics(m: MetricsSnapshot): MetricsSnapshot {
  return JSON.parse(JSON.stringify(m)) as MetricsSnapshot;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpKeypoints(a: Keypoint[], b: Keypoint[], t: number): Keypoint[] {
  const n = Math.min(a.length, b.length);
  const out: Keypoint[] = [];
  for (let i = 0; i < n; i++) {
    const ka = a[i];
    const kb = b[i];
    out.push({
      x: lerp(ka.x, kb.x, t),
      y: lerp(ka.y, kb.y, t),
      score: lerp(ka.score, kb.score, t),
      name: ka.name,
    });
  }
  return out;
}

function lerpMetrics(a: MetricsSnapshot, b: MetricsSnapshot, t: number): MetricsSnapshot {
  const angleByName = (angles: typeof a.jointAngles, name: string) =>
    angles.find((x) => x.jointName === name);

  const names = new Set<string>();
  a.jointAngles.forEach((j) => names.add(j.jointName));
  b.jointAngles.forEach((j) => names.add(j.jointName));

  const jointAngles = [...names].map((name) => {
    const ja = angleByName(a.jointAngles, name);
    const jb = angleByName(b.jointAngles, name);
    if (ja && jb) {
      return {
        jointName: name,
        angle: Math.round(lerp(ja.angle, jb.angle, t)),
        confidence: lerp(ja.confidence, jb.confidence, t),
        position: {
          x: lerp(ja.position.x, jb.position.x, t),
          y: lerp(ja.position.y, jb.position.y, t),
        },
      };
    }
    return ja ?? jb!;
  });

  const romByName = (rom: typeof a.rom, name: string) => rom.find((x) => x.jointName === name);
  const romNames = new Set<string>();
  a.rom.forEach((r) => romNames.add(r.jointName));
  b.rom.forEach((r) => romNames.add(r.jointName));

  const rom = [...romNames].map((name) => {
    const ra = romByName(a.rom, name);
    const rb = romByName(b.rom, name);
    if (ra && rb) {
      return {
        jointName: name,
        currentAngle: lerp(ra.currentAngle, rb.currentAngle, t),
        minAngle: lerp(ra.minAngle, rb.minAngle, t),
        maxAngle: lerp(ra.maxAngle, rb.maxAngle, t),
        range: Math.round(lerp(ra.range, rb.range, t)),
      };
    }
    return ra ?? rb!;
  });

  return {
    jointAngles,
    rom,
    symmetry: t < 0.5 ? a.symmetry : b.symmetry,
    velocity: t < 0.5 ? a.velocity : b.velocity,
    timestamp: Math.round(lerp(a.timestamp, b.timestamp, t)),
  };
}

/**
 * Linear interpolation of keypoints and metrics between samples by video `currentTime`.
 * Samples must be sorted by `videoTime` (non-decreasing).
 */
export function interpolatePoseAtTime(
  samples: PoseRecordingSample[],
  t: number
): { keypoints: Keypoint[]; metrics: MetricsSnapshot } | null {
  if (samples.length === 0) return null;

  if (samples.length === 1 || t <= samples[0].videoTime) {
    const s = samples[0];
    return {
      keypoints: s.keypoints.map((k) => ({ ...k })),
      metrics: cloneMetrics(s.metrics),
    };
  }

  const last = samples[samples.length - 1];
  if (t >= last.videoTime) {
    return {
      keypoints: last.keypoints.map((k) => ({ ...k })),
      metrics: cloneMetrics(last.metrics),
    };
  }

  let i = 0;
  while (i < samples.length - 1 && samples[i + 1].videoTime < t) {
    i += 1;
  }

  const s0 = samples[i];
  const s1 = samples[i + 1];
  const span = s1.videoTime - s0.videoTime;
  const alpha = span > 1e-6 ? (t - s0.videoTime) / span : 0;

  return {
    keypoints: lerpKeypoints(s0.keypoints, s1.keypoints, alpha),
    metrics: lerpMetrics(s0.metrics, s1.metrics, alpha),
  };
}

const MAX_SAMPLES = 500;

export function appendPoseRecordingSample(
  buffer: PoseRecordingSample[],
  sample: PoseRecordingSample
): void {
  buffer.push(sample);
  while (buffer.length > MAX_SAMPLES) {
    buffer.shift();
  }
}
