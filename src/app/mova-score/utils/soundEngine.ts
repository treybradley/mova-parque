import * as Tone from 'tone';
import { Blob, SoundSettings, ScaleType } from '@/app/mova-score/types';

// Scale intervals (semitones from root)
const SCALES = {
  'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  'major': [0, 2, 4, 5, 7, 9, 11],
  'minor': [0, 2, 3, 5, 7, 8, 10],
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
  'blues': [0, 3, 5, 6, 7, 10],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'lydian': [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10]
};

// Export helper functions for MIDI generation
export function getScaleNotes(scale: ScaleType, rootNote: number): number[] {
  const intervals = SCALES[scale];
  const notes: number[] = [];
  
  // Generate scale notes across full MIDI range
  for (let octave = 0; octave < 11; octave++) {
    intervals.forEach(interval => {
      const note = octave * 12 + ((interval + rootNote) % 12);
      if (note >= 0 && note <= 127) {
        notes.push(note);
      }
    });
  }
  
  return notes.sort((a, b) => a - b);
}

export function quantizeToPitch(pitch: number, scaleNotes: number[]): number {
  // Find closest note in scale
  return scaleNotes.reduce((prev, curr) => {
    return Math.abs(curr - pitch) < Math.abs(prev - pitch) ? curr : prev;
  });
}

export function mapToRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

interface ActiveVoice {
  synth: Tone.PolySynth | Tone.FMSynth | Tone.AMSynth;
  panner: Tone.Panner;
  currentNote: number;
}

export class SoundEngine {
  private voices: Map<string, ActiveVoice> = new Map();
  private settings: SoundSettings;
  private masterVolume: Tone.Volume;
  private videoWidth: number = 1;
  private videoHeight: number = 1;
  private isStarted: boolean = false;
  private cleanupTimeouts: Map<string, number> = new Map();
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;

  constructor(settings: SoundSettings) {
    this.settings = settings;
    this.masterVolume = new Tone.Volume(Tone.gainToDb(settings.masterVolume)).toDestination();
    
    // Monitor audio context state
    setInterval(() => {
      if (this.isStarted && Tone.context.state !== 'running') {
        console.warn('Audio context suspended, attempting to resume...');
        Tone.context.resume();
      }
    }, 1000);
  }

  async start() {
    if (!this.isStarted) {
      await Tone.start();
      this.isStarted = true;
      console.log('🎵 Tone.js started - Audio context:', Tone.context.state);
    }
  }

  getDebugInfo() {
    return {
      activeVoices: this.voices.size,
      maxVoices: this.settings.maxVoices,
      contextState: Tone.context.state,
      isStarted: this.isStarted,
      pendingCleanups: this.cleanupTimeouts.size
    };
  }

  setVideoSize(width: number, height: number) {
    this.videoWidth = width;
    this.videoHeight = height;
  }

  updateSettings(settings: SoundSettings) {
    this.settings = settings;
    this.masterVolume.volume.value = Tone.gainToDb(Math.max(0.001, settings.masterVolume));

    // Update all existing synths
    this.voices.forEach(voice => {
      this.updateSynthEnvelope(voice.synth);
    });
  }

  private createSynth(): Tone.PolySynth | Tone.FMSynth | Tone.AMSynth {
    const envelope = {
      attack: this.settings.attack,
      decay: this.settings.decay,
      sustain: this.settings.sustain,
      release: this.settings.release
    };

    let synth: Tone.PolySynth | Tone.FMSynth | Tone.AMSynth;

    switch (this.settings.synthType) {
      case 'fmsine':
        synth = new Tone.FMSynth({
          envelope,
          modulationEnvelope: envelope
        });
        break;
      case 'amsine':
        synth = new Tone.AMSynth({
          envelope
        });
        break;
      default:
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: this.settings.synthType },
          envelope
        });
    }

    return synth;
  }

  private updateSynthEnvelope(synth: Tone.PolySynth | Tone.FMSynth | Tone.AMSynth) {
    const envelope = {
      attack: this.settings.attack,
      decay: this.settings.decay,
      sustain: this.settings.sustain,
      release: this.settings.release
    };

    if (synth instanceof Tone.PolySynth) {
      synth.set({ envelope });
    } else if (synth instanceof Tone.FMSynth || synth instanceof Tone.AMSynth) {
      synth.envelope.attack = envelope.attack;
      synth.envelope.decay = envelope.decay;
      synth.envelope.sustain = envelope.sustain;
      synth.envelope.release = envelope.release;
    }
  }

  private mapToMidiNote(normalizedY: number): number {
    const { pitchMin, pitchMax, pitchInverted, scale, rootNote, quantizeToScale } = this.settings;
    
    // Invert Y if needed (top = high pitch)
    const y = pitchInverted ? (1 - normalizedY) : normalizedY;
    
    // Map to MIDI range
    let midiNote = pitchMin + y * (pitchMax - pitchMin);
    
    // Quantize to scale if enabled
    if (quantizeToScale) {
      const scaleIntervals = SCALES[scale];
      const octave = Math.floor(midiNote / 12);
      const noteInOctave = Math.round(midiNote % 12);
      
      // Find closest note in scale
      const closestInterval = scaleIntervals.reduce((prev, curr) => {
        const adjustedCurr = (curr + rootNote) % 12;
        const adjustedPrev = (prev + rootNote) % 12;
        return Math.abs(adjustedCurr - noteInOctave) < Math.abs(adjustedPrev - noteInOctave)
          ? curr
          : prev;
      });
      
      midiNote = octave * 12 + ((closestInterval + rootNote) % 12);
    }
    
    return Math.round(Math.max(pitchMin, Math.min(pitchMax, midiNote)));
  }

  private mapToPan(normalizedX: number): number {
    // Map 0-1 to -1 to 1 (left to right)
    return normalizedX * 2 - 1;
  }

  private mapToVelocity(normalizedSize: number): number {
    const { velocityMin, velocityMax } = this.settings;
    return velocityMin + normalizedSize * (velocityMax - velocityMin);
  }

  updateBlobs(blobs: Blob[]) {
    if (!this.settings.enabled || !this.isStarted) {
      this.stopAll();
      return;
    }

    const currentBlobIds = new Set(blobs.map(b => b.id));
    
    // Stop voices for blobs that disappeared
    this.voices.forEach((voice, id) => {
      if (!currentBlobIds.has(id)) {
        this.stopVoice(id);
      }
    });

    // Limit number of blobs to maxVoices (keep largest blobs)
    const limitedBlobs = blobs.length > this.settings.maxVoices
      ? blobs
          .sort((a, b) => b.size - a.size)
          .slice(0, this.settings.maxVoices)
      : blobs;

    // Update or create voices for current blobs
    limitedBlobs.forEach(blob => {
      this.updateBlob(blob);
    });
  }

  private updateBlob(blob: Blob) {
    const normalizedX = blob.centerX / this.videoWidth;
    const normalizedY = blob.centerY / this.videoHeight;
    const normalizedSize = Math.min(blob.size / (this.videoWidth * this.videoHeight), 1);

    // Calculate note and parameters
    const midiNote = this.settings.pitchEnabled 
      ? this.mapToMidiNote(normalizedY) 
      : 60; // Middle C
    
    const pan = this.settings.panEnabled 
      ? this.mapToPan(normalizedX) 
      : 0;
    
    const velocity = this.settings.sizeToVelocity 
      ? this.mapToVelocity(normalizedSize) 
      : 0.7;

    const existingVoice = this.voices.get(blob.id);

    if (existingVoice) {
      // Update pan smoothly
      existingVoice.panner.pan.rampTo(pan, 0.05);
      
      // Only retrigger if note changed significantly (more than a semitone)
      if (Math.abs(existingVoice.currentNote - midiNote) > 1) {
        const freq = Tone.Frequency(midiNote, 'midi').toFrequency();
        
        // Use short note duration to prevent sustained feedback
        const duration = this.settings.attack + this.settings.release + 0.1;
        
        if (existingVoice.synth instanceof Tone.PolySynth) {
          existingVoice.synth.triggerAttackRelease(freq, duration, undefined, velocity);
        } else {
          existingVoice.synth.triggerAttackRelease(freq, duration);
        }
        existingVoice.currentNote = midiNote;
      }
    } else {
      // Create new voice
      const synth = this.createSynth();
      const panner = new Tone.Panner(pan);
      synth.connect(panner);
      panner.connect(this.masterVolume);

      const freq = Tone.Frequency(midiNote, 'midi').toFrequency();
      
      // Trigger with a short duration instead of sustained note
      const duration = this.settings.attack + this.settings.release + 0.15;
      
      if (synth instanceof Tone.PolySynth) {
        synth.triggerAttackRelease(freq, duration, undefined, velocity);
      } else {
        synth.triggerAttackRelease(freq, duration);
      }

      this.voices.set(blob.id, { synth, panner, currentNote: midiNote });
    }
  }

  private stopVoice(id: string) {
    const voice = this.voices.get(id);
    if (voice) {
      // Cancel any pending cleanup
      const existingTimeout = this.cleanupTimeouts.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.cleanupTimeouts.delete(id);
      }

      // Trigger release
      try {
        voice.synth.triggerRelease();
      } catch (error) {
        console.error('Error releasing synth:', error);
      }
      
      // Clean up after release time
      const timeoutId = window.setTimeout(() => {
        try {
          voice.synth.dispose();
          voice.panner.dispose();
        } catch (error) {
          console.error('Error disposing voice:', error);
        }
        this.voices.delete(id);
        this.cleanupTimeouts.delete(id);
      }, this.settings.release * 1000 + 100);
      
      this.cleanupTimeouts.set(id, timeoutId);
    }
  }

  stopAll() {
    console.log('🛑 Stopping all voices, active:', this.voices.size);
    this.voices.forEach((_, id) => this.stopVoice(id));
  }

  // Get audio stream for recording
  getRecordingStream(): MediaStream | null {
    if (!this.recordingDestination && this.isStarted) {
      // Access Tone.js's underlying AudioContext
      const audioContext = Tone.context as unknown as AudioContext;
      
      // Create a MediaStream destination
      this.recordingDestination = audioContext.createMediaStreamDestination();
      
      // Connect master volume to recording destination
      // (it's already connected to .toDestination() for speakers)
      this.masterVolume.connect(this.recordingDestination);
    }
    return this.recordingDestination?.stream || null;
  }

  // Stop recording and clean up
  stopRecording() {
    if (this.recordingDestination) {
      this.masterVolume.disconnect(this.recordingDestination);
      this.recordingDestination = null;
    }
  }

  dispose() {
    console.log('🗑️ Disposing sound engine');
    
    // Stop recording if active
    this.stopRecording();
    
    // Clear all pending timeouts
    this.cleanupTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.cleanupTimeouts.clear();
    
    // Dispose all voices immediately
    this.voices.forEach(voice => {
      try {
        voice.synth.dispose();
        voice.panner.dispose();
      } catch (error) {
        console.error('Error disposing voice:', error);
      }
    });
    this.voices.clear();
    
    // Dispose master volume
    try {
      this.masterVolume.dispose();
    } catch (error) {
      console.error('Error disposing master volume:', error);
    }
  }
}
