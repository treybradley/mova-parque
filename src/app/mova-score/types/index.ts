export type TrackingMode = 'color' | 'luminance' | 'edge';
export type BoxType = 'rectangle' | 'circle' | 'l-frame' | 'x-frame' | 'scope' | 'corners' | 'none';
export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type CentroidType = 'dot' | 'cross' | 'circle' | 'none';
export type SynthType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'fmsine' | 'amsine';
export type ScaleType = 'chromatic' | 'major' | 'minor' | 'pentatonic-major' | 'pentatonic-minor' | 'blues' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian';

export interface Blob {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  size: number;
  velocity: number;
}

export interface TrackingSettings {
  mode: TrackingMode;
  tolerance: number;
  minBlobSize: number;
  maxBlobSize: number;
  targetColor?: string;
}

export interface SoundSettings {
  enabled: boolean;
  synthType: SynthType;
  masterVolume: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  maxVoices: number;
  
  // Pitch mapping
  pitchEnabled: boolean;
  pitchMin: number; // MIDI note number
  pitchMax: number; // MIDI note number
  pitchInverted: boolean;
  scale: ScaleType;
  rootNote: number; // 0-11 (C-B)
  quantizeToScale: boolean;
  
  // Pan mapping
  panEnabled: boolean;
  
  // Size/Velocity mapping
  sizeToVelocity: boolean;
  velocityMin: number;
  velocityMax: number;
}

export interface VisualSettings {
  showBoxes: boolean;
  boxType: BoxType;
  boxColor: string;
  boxWeight: number;
  boxOpacity: number;
  
  showConnections: boolean;
  connectionLineStyle: LineStyle;
  connectionColor: string;
  connectionWeight: number;
  connectionOpacity: number;
  
  showCentroids: boolean;
  centroidType: CentroidType;
  centroidColor: string;
  centroidSize: number;
  centroidOpacity: number;
}

export interface VideoSourceState {
  mode: 'upload' | 'camera';
  videoElement: HTMLVideoElement | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

// Phase 3: MIDI Recording & Export
export interface BlobFrame {
  timestamp: number;      // Video time in seconds
  blobs: Blob[];         // Raw blob data at this frame
}

export interface MIDINote {
  track: number;         // Blob ID mapped to track
  blobId: string;
  pitch: number;         // MIDI note (0-127)
  velocity: number;      // 0-127
  startTime: number;     // Seconds from video start
  duration: number;      // Seconds
  pan?: number;          // -1 to 1 (converted to CC10: 0-127)
}

export interface RecordingState {
  isRecording: boolean;
  blobFrames: BlobFrame[];
  midiNotes: MIDINote[];
  duration: number;
  settingsSnapshot: {
    tracking: TrackingSettings;
    mapping: SoundSettings;
  } | null;
}
