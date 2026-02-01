import { BlobFrame, MIDINote, SoundSettings, Blob } from '@/app/mova-score/types';
import { getScaleNotes, mapToRange, quantizeToPitch } from './soundEngine';

interface BlobState {
  blobId: string;
  lastSeen: number;
  noteStartTime: number;
  pitch: number;
  velocity: number;
  pan: number;
}

/**
 * Generates MIDI notes from blob frames using current mapping settings
 * This allows regeneration without re-recording blob detection
 */
export function generateMIDIFromBlobs(
  blobFrames: BlobFrame[],
  mappingSettings: SoundSettings,
  videoSize: { width: number; height: number }
): MIDINote[] {
  if (blobFrames.length === 0) return [];

  const midiNotes: MIDINote[] = [];
  const activeBlobStates = new Map<string, BlobState>();
  
  // Get scale notes for quantization
  const scaleNotes = mappingSettings.quantizeToScale 
    ? getScaleNotes(mappingSettings.scale, mappingSettings.rootNote)
    : null;

  // Process each frame
  blobFrames.forEach((frame, frameIndex) => {
    const currentBlobIds = new Set<string>();

    // Process active blobs in this frame
    frame.blobs.forEach((blob) => {
      currentBlobIds.add(blob.id);

      // Calculate MIDI parameters from blob position/size
      const pitch = calculatePitch(blob, videoSize, mappingSettings, scaleNotes);
      const velocity = calculateVelocity(blob, mappingSettings);
      const pan = calculatePan(blob, videoSize, mappingSettings);

      const existingState = activeBlobStates.get(blob.id);

      if (existingState) {
        // Blob continues - check if pitch changed significantly (new note)
        if (Math.abs(existingState.pitch - pitch) > 1) {
          // End previous note
          midiNotes.push({
            track: getTrackNumber(existingState.blobId),
            blobId: existingState.blobId,
            pitch: existingState.pitch,
            velocity: existingState.velocity,
            startTime: existingState.noteStartTime,
            duration: frame.timestamp - existingState.noteStartTime,
            pan: existingState.pan
          });

          // Start new note at new pitch
          activeBlobStates.set(blob.id, {
            blobId: blob.id,
            lastSeen: frame.timestamp,
            noteStartTime: frame.timestamp,
            pitch,
            velocity,
            pan
          });
        } else {
          // Same pitch - update state
          existingState.lastSeen = frame.timestamp;
          existingState.velocity = velocity; // Could average or use max
          existingState.pan = pan;
        }
      } else {
        // New blob - start new note
        activeBlobStates.set(blob.id, {
          blobId: blob.id,
          lastSeen: frame.timestamp,
          noteStartTime: frame.timestamp,
          pitch,
          velocity,
          pan
        });
      }
    });

    // Check for blobs that disappeared (end their notes)
    const disappearedBlobs: string[] = [];
    activeBlobStates.forEach((state, blobId) => {
      if (!currentBlobIds.has(blobId)) {
        // Blob disappeared - end note
        midiNotes.push({
          track: getTrackNumber(state.blobId),
          blobId: state.blobId,
          pitch: state.pitch,
          velocity: state.velocity,
          startTime: state.noteStartTime,
          duration: state.lastSeen - state.noteStartTime,
          pan: state.pan
        });
        disappearedBlobs.push(blobId);
      }
    });

    // Remove disappeared blobs
    disappearedBlobs.forEach(id => activeBlobStates.delete(id));
  });

  // End any remaining active notes at the end of recording
  const lastTimestamp = blobFrames[blobFrames.length - 1].timestamp;
  activeBlobStates.forEach((state) => {
    midiNotes.push({
      track: getTrackNumber(state.blobId),
      blobId: state.blobId,
      pitch: state.pitch,
      velocity: state.velocity,
      startTime: state.noteStartTime,
      duration: lastTimestamp - state.noteStartTime,
      pan: state.pan
    });
  });

  console.log(`📝 Generated ${midiNotes.length} MIDI notes from ${blobFrames.length} frames`);
  return midiNotes;
}

function calculatePitch(
  blob: Blob,
  videoSize: { width: number; height: number },
  settings: SoundSettings,
  scaleNotes: number[] | null
): number {
  if (!settings.pitchEnabled) return settings.pitchMin;

  // Map Y position to pitch (inverted by default)
  const normalizedY = blob.centerY / videoSize.height;
  const yValue = settings.pitchInverted ? (1 - normalizedY) : normalizedY;
  
  let pitch = mapToRange(yValue, 0, 1, settings.pitchMin, settings.pitchMax);

  // Quantize to scale if enabled
  if (scaleNotes) {
    pitch = quantizeToPitch(pitch, scaleNotes);
  } else {
    pitch = Math.round(pitch);
  }

  return Math.max(0, Math.min(127, pitch));
}

function calculateVelocity(blob: Blob, settings: SoundSettings): number {
  let velocity: number;

  if (settings.sizeToVelocity) {
    // Use blob's pre-calculated velocity (from size)
    velocity = mapToRange(
      blob.velocity,
      0,
      1,
      settings.velocityMin,
      settings.velocityMax
    );
  } else {
    // Use fixed velocity
    velocity = (settings.velocityMin + settings.velocityMax) / 2;
  }

  return Math.round(Math.max(0, Math.min(127, velocity)));
}

function calculatePan(
  blob: Blob,
  videoSize: { width: number; height: number },
  settings: SoundSettings
): number {
  if (!settings.panEnabled) return 0;

  // Map X position to pan (-1 to 1)
  const normalizedX = blob.centerX / videoSize.width;
  return (normalizedX * 2) - 1; // Convert 0-1 to -1 to 1
}

function getTrackNumber(blobId: string): number {
  // Extract track number from blob ID (format: "blob-{trackNum}-{timestamp}")
  const match = blobId.match(/blob-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}
