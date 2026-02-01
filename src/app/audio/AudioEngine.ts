import * as Tone from 'tone';

// Musical preset definitions
interface SonicPreset {
  root: string;
  scale: string[];
  mode: string;
  tempo: number;
  timbre: {
    waveform: 'sine' | 'triangle' | 'sawtooth' | 'square';
    brightness: number;
    harmonics: number;
  };
  layers: {
    drone: { octave: number; notes: string[] };
    atmosphere: { octave: number; notes: string[] };
    shimmer: { octave: number; notes: string[] };
    pulse: { octave: number; pattern: string };
    reactive: { octave: number; range: string };
  };
}

const SONIC_PRESETS: SonicPreset[] = [
  {
    // Deep Sleep
    root: 'C2',
    scale: ['C', 'Eb', 'F', 'G', 'Bb'],
    mode: 'minor',
    tempo: 60,
    timbre: {
      waveform: 'sine',
      brightness: 0.2,
      harmonics: 1,
    },
    layers: {
      drone: { octave: 1, notes: ['C2'] },
      atmosphere: { octave: 2, notes: ['C3', 'D#3', 'G3'] },
      shimmer: { octave: 5, notes: ['C5', 'D#5', 'G5'] },
      pulse: { octave: 2, pattern: 'I' },
      reactive: { octave: 3, range: 'full' },
    },
  },
  {
    // Readiness
    root: 'D3',
    scale: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
    mode: 'dorian',
    tempo: 90,
    timbre: {
      waveform: 'triangle',
      brightness: 0.5,
      harmonics: 3,
    },
    layers: {
      drone: { octave: 2, notes: ['D2'] },
      atmosphere: { octave: 3, notes: ['D3', 'F3', 'A3'] },
      shimmer: { octave: 5, notes: ['D5', 'F5', 'A5', 'C5'] },
      pulse: { octave: 2, pattern: 'I-IV' },
      reactive: { octave: 4, range: 'full' },
    },
  },
  {
    // Recovery
    root: 'G2',
    scale: ['G', 'A', 'B', 'D', 'E'],
    mode: 'major',
    tempo: 72,
    timbre: {
      waveform: 'sine',
      brightness: 0.4,
      harmonics: 2,
    },
    layers: {
      drone: { octave: 1, notes: ['G2'] },
      atmosphere: { octave: 3, notes: ['G3', 'B3', 'D4'] },
      shimmer: { octave: 5, notes: ['G5', 'B5', 'D6'] },
      pulse: { octave: 2, pattern: 'I-V-IV' },
      reactive: { octave: 3, range: 'full' },
    },
  },
  {
    // Vitality
    root: 'A3',
    scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G'],
    mode: 'mixolydian',
    tempo: 110,
    timbre: {
      waveform: 'sawtooth',
      brightness: 0.7,
      harmonics: 5,
    },
    layers: {
      drone: { octave: 2, notes: ['A2'] },
      atmosphere: { octave: 3, notes: ['A3', 'C#4', 'E4'] },
      shimmer: { octave: 6, notes: ['A6', 'C#6', 'E6', 'G6'] },
      pulse: { octave: 3, pattern: 'I-IV-V' },
      reactive: { octave: 4, range: 'full' },
    },
  },
  {
    // Peak
    root: 'E3',
    scale: ['E', 'F#', 'G#', 'A#', 'B', 'C#', 'D#'],
    mode: 'lydian',
    tempo: 130,
    timbre: {
      waveform: 'square',
      brightness: 0.9,
      harmonics: 7,
    },
    layers: {
      drone: { octave: 2, notes: ['E2'] },
      atmosphere: { octave: 4, notes: ['E4', 'G#4', 'B4', 'D#5'] },
      shimmer: { octave: 6, notes: ['E6', 'G#6', 'B6', 'D#6'] },
      pulse: { octave: 3, pattern: 'I-II-IV-V' },
      reactive: { octave: 5, range: 'full' },
    },
  },
];

interface AudioSettings {
  enabled: boolean;
  masterVolume: number;
  sonicPreset: number;
  layers: {
    drone: number;
    atmosphere: number;
    shimmer: number;
    pulse: number;
    reactive: number;
  };
  harmonic: {
    complexity: number;
    progressionSpeed: number;
    brightness: number;
    richness: number;
  };
  reactivity: {
    motionSensitivity: number;
    velocityInfluence: number;
    proximityEffect: number;
  };
  effects: {
    reverb: number;
    delay: number;
    filter: number;
  };
}

export class AudioEngine {
  private initialized: boolean = false;
  private currentPreset: SonicPreset;
  private settings: AudioSettings;
  
  // Synths and effects
  private droneSynth: Tone.MonoSynth | null = null;
  private atmosphereSynth: Tone.PolySynth | null = null;
  private shimmerSynth: Tone.PolySynth | null = null;
  private pulseSynth: Tone.MembraneSynth | null = null;
  
  // Effects
  private masterReverb: Tone.Reverb | null = null;
  private masterDelay: Tone.FeedbackDelay | null = null;
  private masterFilter: Tone.Filter | null = null;
  private masterVolume: Tone.Volume | null = null;
  private chorusEffect: Tone.Chorus | null = null;
  
  // Animation frame for reactive updates
  private updateLoopId: number | null = null;
  
  // Timeout IDs for scheduled events
  private atmosphereTimeoutId: number | null = null;
  private shimmerTimeoutId: number | null = null;
  private pulseTimeoutId: number | null = null;
  
  constructor() {
    this.currentPreset = SONIC_PRESETS[0];
    this.settings = this.getDefaultSettings();
  }
  
  private getDefaultSettings(): AudioSettings {
    return {
      enabled: false,
      masterVolume: 0.8,
      sonicPreset: 0,
      layers: {
        drone: 0.51,
        atmosphere: 0.90,
        shimmer: 0.99,
        pulse: 0,
        reactive: 0.4,
      },
      harmonic: {
        complexity: 0.18,
        progressionSpeed: 0.5,
        brightness: 0.5,
        richness: 0.5,
      },
      reactivity: {
        motionSensitivity: 0.5,
        velocityInfluence: 0.5,
        proximityEffect: 0.5,
      },
      effects: {
        reverb: 0,
        delay: 0,
        filter: 0.6,
      },
    };
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Start Tone.js audio context
      await Tone.start();
      console.log('Tone.js audio context started');
      
      // Create effects chain
      this.masterReverb = new Tone.Reverb({
        decay: 3,
        wet: 0.5,
      }).toDestination();
      
      this.masterDelay = new Tone.FeedbackDelay({
        delayTime: '8n',
        feedback: 0.3,
        wet: 0.2,
      }).connect(this.masterReverb);
      
      this.masterFilter = new Tone.Filter({
        frequency: 2000,
        type: 'lowpass',
        rolloff: -12,
      }).connect(this.masterDelay);
      
      this.chorusEffect = new Tone.Chorus({
        frequency: 1.5,
        delayTime: 3.5,
        depth: 0.7,
        type: 'sine',
        spread: 180,
        wet: 0.3,
      }).connect(this.masterFilter);
      
      this.masterVolume = new Tone.Volume(-10).connect(this.chorusEffect);
      
      // Mark as initialized before creating synths
      this.initialized = true;
      
      // Create synths
      this.createSynths();
      
      console.log('AudioEngine initialized');
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      throw error;
    }
  }
  
  private createSynths(): void {
    // Don't create synths if not initialized
    if (!this.initialized || !this.masterVolume) return;
    
    const preset = this.currentPreset;
    
    // Drone - continuous bass note
    this.droneSynth = new Tone.MonoSynth({
      oscillator: { type: preset.timbre.waveform },
      envelope: {
        attack: 2,
        decay: 0,
        sustain: 1,
        release: 4,
      },
      volume: -20,
    }).connect(this.masterVolume!);
    
    // Atmosphere - chord pads
    this.atmosphereSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: preset.timbre.waveform },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 0.8,
        release: 4,
      },
      volume: -15,
    }).connect(this.masterVolume!);
    
    // Shimmer - high sparkly tones
    this.shimmerSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: preset.timbre.waveform },
      envelope: {
        attack: 0.01,
        decay: 0.5,
        sustain: 0.1,
        release: 2,
      },
      volume: -25,
    }).connect(this.masterVolume!);
    
    // Pulse - rhythmic foundation
    this.pulseSynth = new Tone.MembraneSynth({
      volume: -15,
    }).connect(this.masterVolume!);
  }
  
  private disposeSynths(): void {
    if (this.droneSynth) {
      this.droneSynth.triggerRelease();
      this.droneSynth.dispose();
      this.droneSynth = null;
    }
    
    if (this.atmosphereSynth) {
      this.atmosphereSynth.releaseAll();
      this.atmosphereSynth.dispose();
      this.atmosphereSynth = null;
    }
    
    if (this.shimmerSynth) {
      this.shimmerSynth.triggerRelease();
      this.shimmerSynth.dispose();
      this.shimmerSynth = null;
    }
    
    if (this.pulseSynth) {
      this.pulseSynth.triggerRelease();
      this.pulseSynth.dispose();
      this.pulseSynth = null;
    }
  }
  
  async setEnabled(enabled: boolean): Promise<void> {
    if (enabled && !this.initialized) {
      await this.initialize();
    }
    
    this.settings.enabled = enabled;
    
    if (enabled) {
      this.startLayers();
    } else {
      this.stopLayers();
    }
  }
  
  private startLayers(): void {
    const preset = this.currentPreset;
    
    // Start drone (continuous)
    if (this.droneSynth && this.settings.layers.drone > 0) {
      this.droneSynth.triggerAttack(preset.layers.drone.notes[0], Tone.now());
      this.droneSynth.volume.value = this.volumeToDb(this.settings.layers.drone);
    }
    
    // Start atmosphere chords (repeating)
    if (this.atmosphereSynth && this.settings.layers.atmosphere > 0) {
      this.atmosphereSynth.volume.value = this.volumeToDb(this.settings.layers.atmosphere);
      this.playAtmosphereChords();
    }
    
    // Start shimmer (occasional sparkles)
    if (this.shimmerSynth && this.settings.layers.shimmer > 0) {
      this.shimmerSynth.volume.value = this.volumeToDb(this.settings.layers.shimmer);
      this.playShimmer();
    }
    
    // Start pulse (rhythmic beat)
    if (this.pulseSynth && this.settings.layers.pulse > 0) {
      this.pulseSynth.volume.value = this.volumeToDb(this.settings.layers.pulse);
      this.playPulse();
    }
  }
  
  private stopLayers(): void {
    // Clear scheduled timeouts
    if (this.atmosphereTimeoutId !== null) {
      clearTimeout(this.atmosphereTimeoutId);
      this.atmosphereTimeoutId = null;
    }
    
    if (this.shimmerTimeoutId !== null) {
      clearTimeout(this.shimmerTimeoutId);
      this.shimmerTimeoutId = null;
    }
    
    if (this.pulseTimeoutId !== null) {
      clearTimeout(this.pulseTimeoutId);
      this.pulseTimeoutId = null;
    }
    
    if (this.droneSynth) {
      this.droneSynth.triggerRelease();
    }
    
    if (this.atmosphereSynth) {
      this.atmosphereSynth.releaseAll();
    }
    
    if (this.shimmerSynth) {
      this.shimmerSynth.triggerRelease();
    }
    
    if (this.pulseSynth) {
      this.pulseSynth.triggerRelease();
    }
  }
  
  private playAtmosphereChords(): void {
    if (!this.atmosphereSynth || this.settings.layers.atmosphere === 0 || !this.settings.enabled) return;
    
    const preset = this.currentPreset;
    const notes = preset.layers.atmosphere.notes;
    
    // Calculate the interval based on tempo and progression speed
    const speedMultiplier = 0.5 + (this.settings.harmonic.progressionSpeed * 1.5); // 0.5x to 2x speed
    const interval = ((60 / preset.tempo) * 4 * 1000) / speedMultiplier; // 4 beats in milliseconds, scaled by speed
    
    // Use a duration slightly shorter than the interval to prevent overlap
    const duration = interval / 1000 * 0.8; // Convert back to seconds and make it 80% of interval
    
    // Release all previous notes cleanly before triggering new chord
    this.atmosphereSynth.releaseAll();
    
    // Small delay to let previous notes fade out, preventing voice stealing clicks
    setTimeout(() => {
      if (!this.atmosphereSynth || !this.settings.enabled) return;
      
      // Play chord
      this.atmosphereSynth.triggerAttackRelease(notes, duration, Tone.now());
    }, 50);
    
    // Schedule next chord using setTimeout
    this.atmosphereTimeoutId = window.setTimeout(() => {
      if (this.settings.enabled && this.settings.layers.atmosphere > 0) {
        this.playAtmosphereChords();
      }
    }, interval);
  }
  
  private playShimmer(): void {
    if (!this.shimmerSynth || this.settings.layers.shimmer === 0 || !this.settings.enabled) return;
    
    const preset = this.currentPreset;
    const notes = preset.layers.shimmer.notes;
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    
    // Trigger shimmer
    this.shimmerSynth.triggerAttackRelease(randomNote, '16n', Tone.now());
    
    // Schedule next shimmer (randomized) using setTimeout instead of Transport
    const interval = (Math.random() * 2 + 1) * 1000; // 1-3 seconds in milliseconds
    this.shimmerTimeoutId = window.setTimeout(() => {
      if (this.settings.enabled && this.settings.layers.shimmer > 0) {
        this.playShimmer();
      }
    }, interval);
  }
  
  private playPulse(): void {
    if (!this.pulseSynth || this.settings.layers.pulse === 0 || !this.settings.enabled) return;
    
    const preset = this.currentPreset;
    
    // Calculate the interval based on tempo (1 beat)
    const interval = (60 / preset.tempo) * 1000; // 1 beat in milliseconds
    
    // Trigger pulse - MembraneSynth doesn't need a note, just a trigger
    this.pulseSynth.triggerAttackRelease('16n', Tone.now());
    
    // Schedule next pulse using setTimeout
    this.pulseTimeoutId = window.setTimeout(() => {
      if (this.settings.enabled && this.settings.layers.pulse > 0) {
        this.playPulse();
      }
    }, interval);
  }
  
  setPreset(presetIndex: number): void {
    if (presetIndex < 0 || presetIndex >= SONIC_PRESETS.length) return;
    
    // Just update the preset setting if not initialized yet
    if (!this.initialized) {
      this.currentPreset = SONIC_PRESETS[presetIndex];
      this.settings.sonicPreset = presetIndex;
      return;
    }
    
    const wasPlaying = this.settings.enabled;
    
    // Stop current layers
    if (wasPlaying) {
      this.stopLayers();
    }
    
    // Dispose old synths
    this.disposeSynths();
    
    // Set new preset
    this.currentPreset = SONIC_PRESETS[presetIndex];
    this.settings.sonicPreset = presetIndex;
    
    // Create new synths with new timbre
    this.createSynths();
    
    // Restart if was playing
    if (wasPlaying) {
      setTimeout(() => {
        this.startLayers();
      }, 100);
    }
  }
  
  updateSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
    
    // Update volumes
    if (settings.masterVolume !== undefined && this.masterVolume) {
      this.masterVolume.volume.rampTo(this.volumeToDb(settings.masterVolume), 0.1);
    }
    
    if (settings.layers) {
      if (this.droneSynth && settings.layers.drone !== undefined) {
        this.droneSynth.volume.rampTo(this.volumeToDb(settings.layers.drone), 0.1);
      }
      if (this.atmosphereSynth && settings.layers.atmosphere !== undefined) {
        this.atmosphereSynth.volume.rampTo(this.volumeToDb(settings.layers.atmosphere), 0.1);
      }
      if (this.shimmerSynth && settings.layers.shimmer !== undefined) {
        this.shimmerSynth.volume.rampTo(this.volumeToDb(settings.layers.shimmer), 0.1);
      }
      if (this.pulseSynth && settings.layers.pulse !== undefined) {
        this.pulseSynth.volume.rampTo(this.volumeToDb(settings.layers.pulse), 0.1);
      }
    }
    
    // Update harmonic character
    if (settings.harmonic) {
      // Brightness - controls filter cutoff for all synths
      if (this.masterFilter && settings.harmonic.brightness !== undefined) {
        const brightness = settings.harmonic.brightness;
        // Map brightness 0-1 to 300-8000 Hz
        const filterFreq = 300 + (brightness * 7700);
        this.masterFilter.frequency.rampTo(filterFreq, 0.1);
      }
      
      // Richness - controls chorus depth/wet
      if (this.chorusEffect && settings.harmonic.richness !== undefined) {
        const richness = settings.harmonic.richness;
        this.chorusEffect.wet.rampTo(richness * 0.5, 0.1);
        this.chorusEffect.depth = richness * 0.9;
      }
      
      // Complexity - controls oscillator harmonics and waveform
      if (settings.harmonic.complexity !== undefined) {
        const complexity = settings.harmonic.complexity;
        
        // Morph waveforms based on complexity
        let waveform: OscillatorType;
        if (complexity < 0.25) {
          waveform = 'sine';
        } else if (complexity < 0.5) {
          waveform = 'triangle';
        } else if (complexity < 0.75) {
          waveform = 'sawtooth';
        } else {
          waveform = 'square';
        }
        
        // Update synth oscillators
        if (this.droneSynth) {
          this.droneSynth.oscillator.type = waveform;
        }
        if (this.atmosphereSynth) {
          this.atmosphereSynth.set({ oscillator: { type: waveform } });
        }
        if (this.shimmerSynth) {
          this.shimmerSynth.set({ oscillator: { type: waveform } });
        }
      }
      
      // Progression Speed - affects tempo scaling for atmosphere and shimmer
      // This is handled when notes are triggered, stored in settings
    }
    
    // Update effects
    if (settings.effects) {
      if (this.masterReverb && settings.effects.reverb !== undefined) {
        this.masterReverb.wet.rampTo(settings.effects.reverb, 0.1);
      }
      if (this.masterDelay && settings.effects.delay !== undefined) {
        this.masterDelay.wet.rampTo(settings.effects.delay * 0.5, 0.1);
      }
      if (this.masterFilter && settings.effects.filter !== undefined) {
        const freq = 200 + (settings.effects.filter * 5000);
        this.masterFilter.frequency.rampTo(freq, 0.1);
      }
    }
  }
  
  // Convert 0-1 volume to decibels
  private volumeToDb(volume: number): number {
    if (volume === 0) return -Infinity;
    // Map 0-1 to -40 to 0 dB
    return (volume * 40) - 40;
  }
  
  updateReactiveParams(data: { velocity: number; position: { x: number; y: number }; presence: boolean }): void {
    // This can be expanded to modulate reactive synth parameters based on body tracking
    // For now, it's a placeholder for future implementation
  }
  
  dispose(): void {
    this.stopLayers();
    this.disposeSynths();
    
    if (this.masterReverb) {
      this.masterReverb.dispose();
      this.masterReverb = null;
    }
    
    if (this.masterDelay) {
      this.masterDelay.dispose();
      this.masterDelay = null;
    }
    
    if (this.masterFilter) {
      this.masterFilter.dispose();
      this.masterFilter = null;
    }
    
    if (this.masterVolume) {
      this.masterVolume.dispose();
      this.masterVolume = null;
    }
    
    if (this.chorusEffect) {
      this.chorusEffect.dispose();
      this.chorusEffect = null;
    }
    
    this.initialized = false;
  }
  
  // Helper function to transpose a note by a given number of semitones
  private transposeNote(note: string, semitones: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = note.match(/([A-G]#?)(\d+)/);
    
    if (!match) {
      console.warn('Invalid note format:', note);
      return note; // Return original if can't parse
    }
    
    const [, name, octaveStr] = match;
    const index = notes.indexOf(name);
    
    if (index === -1) {
      console.warn('Invalid note name:', name);
      return note;
    }
    
    const currentOctave = parseInt(octaveStr);
    const totalSemitones = index + semitones;
    const newIndex = ((totalSemitones % 12) + 12) % 12; // Handle negative wrapping
    const octaveChange = Math.floor(totalSemitones / 12);
    const newOctave = currentOctave + octaveChange;
    
    return notes[newIndex] + newOctave;
  }
  
  // Apply register shift to a note
  private applyRegisterShift(note: string): string {
    const semitones = this.settings.harmonic.registerShift * 12; // Convert octaves to semitones
    return this.transposeNote(note, semitones);
  }
}