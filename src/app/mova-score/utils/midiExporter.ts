import MidiWriter from 'midi-writer-js';
import { MIDINote } from '@/app/mova-score/types';

export interface MIDIExportOptions {
  tempo?: number; // BPM (default: 120)
  ppq?: number; // Pulses per quarter note (default: 480)
  videoDuration?: number; // Optional: add end marker at video duration
}

/**
 * Exports MIDI notes to a Type 1 MIDI file (multi-track)
 * Each blob track becomes a separate MIDI track with name "Blob N"
 * File spans full video duration for perfect DAW sync
 */
export function exportMIDIFile(
  midiNotes: MIDINote[],
  options: MIDIExportOptions = {}
): Blob {
  const {
    tempo = 120,
    ppq = 480,
    videoDuration = 0
  } = options;

  // Group notes by track
  const trackMap = new Map<number, MIDINote[]>();
  midiNotes.forEach(note => {
    if (!trackMap.has(note.track)) {
      trackMap.set(note.track, []);
    }
    trackMap.get(note.track)!.push(note);
  });

  // Sort tracks by track number
  const sortedTracks = Array.from(trackMap.entries()).sort((a, b) => a[0] - b[0]);

  // Create MIDI tracks
  const midiTracks: MidiWriter.Track[] = [];

  sortedTracks.forEach(([trackNum, notes]) => {
    const track = new MidiWriter.Track();
    
    // Set track name
    track.addTrackName(`Blob ${trackNum + 1}`);
    
    // Set tempo (only needed on first track, but doesn't hurt)
    track.setTempo(tempo);

    // Convert notes to MIDI events
    // Sort by start time to ensure proper ordering
    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    
    // Convert seconds to ticks
    const secondsToTicks = (seconds: number) => {
      return Math.round(seconds * (ppq * tempo / 60));
    };

    // Keep track of current time in ticks
    let currentTicks = 0;

    sortedNotes.forEach(note => {
      const startTicks = secondsToTicks(note.startTime);
      const durationTicks = Math.max(1, secondsToTicks(note.duration)); // Ensure minimum 1 tick

      // Calculate wait time (delta time from current position)
      const waitTicks = Math.max(0, startTicks - currentTicks);

      // Add note event
      // MidiWriter expects duration as a string like 'T128' for 128 ticks
      const noteEvent = new MidiWriter.NoteEvent({
        pitch: note.pitch,
        duration: `T${durationTicks}`,
        wait: `T${waitTicks}`,
        velocity: note.velocity,
        channel: 1 // All notes on channel 1 (can be customized later)
      });

      track.addEvent(noteEvent);

      // Update current time
      currentTicks = startTicks + durationTicks;
    });

    // If video duration specified, add silence to end to preserve timing
    if (videoDuration > 0) {
      const videoDurationTicks = secondsToTicks(videoDuration);
      if (currentTicks < videoDurationTicks) {
        const remainingTicks = videoDurationTicks - currentTicks;
        // Add a very short, silent note at the end to extend track
        const endMarker = new MidiWriter.NoteEvent({
          pitch: 60, // Middle C
          duration: 'T1',
          wait: `T${remainingTicks}`,
          velocity: 0 // Silent
        });
        track.addEvent(endMarker);
      }
    }

    midiTracks.push(track);
  });

  // Create Type 1 MIDI file (multi-track)
  const writer = new MidiWriter.Writer(midiTracks);

  // Build file and return as Blob
  const midiData = writer.buildFile();
  
  // midiData is already a Uint8Array, convert to Blob directly
  return new Blob([midiData], { type: 'audio/midi' });
}

/**
 * Triggers download of MIDI file in browser
 */
export function downloadMIDIFile(
  midiNotes: MIDINote[],
  options: MIDIExportOptions = {},
  filename?: string
): void {
  const blob = exportMIDIFile(midiNotes, options);
  
  // Generate filename with timestamp if not provided
  const finalFilename = filename || `video-to-midi_${Date.now()}.mid`;
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
