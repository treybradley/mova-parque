import { useRef, useEffect, useState } from "react";
import { RecordingState } from "@/app/mova-score/types";
import {
  Circle,
  Square,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface TimelineProps {
  recordingState: RecordingState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
  onExportMIDI: () => void;
  currentTime: number;
  videoDuration: number;
}

const TRACK_HEIGHT = 20;
const NOTE_MIN_WIDTH = 2;

export function Timeline({
  recordingState,
  onStartRecording,
  onStopRecording,
  onClearRecording,
  onExportMIDI,
  currentTime,
  videoDuration,
}: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollX, setScrollX] = useState(0);

  const handleZoomIn = () =>
    setZoomLevel((prev) => Math.min(prev * 1.5, 10));
  const handleZoomOut = () =>
    setZoomLevel((prev) => Math.max(prev / 1.5, 1));

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + scroll
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    } else {
      // Horizontal scroll only
      setScrollX((prev) =>
        Math.max(0, prev + e.deltaX + e.deltaY),
      );
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    // Use video duration if available, but handle Infinity for webcam streams
    const duration = (videoDuration && isFinite(videoDuration) && videoDuration > 0) 
      ? videoDuration 
      : 0;

    if (duration === 0 || !isFinite(duration)) {
      ctx.fillStyle = "#666";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        videoDuration === Infinity 
          ? "Live stream - Record to generate timeline"
          : "Waiting for video...",
        width / 2,
        height / 2,
      );
      return;
    }

    // Apply zoom transformation
    const zoomedWidth = width * zoomLevel;

    // Time axis height (reduced from 20 to 12 for more track space)
    const TIME_AXIS_HEIGHT = 12;
    const tracksAreaHeight = height - TIME_AXIS_HEIGHT;

    // Draw timeline background spanning full video duration
    ctx.save();
    ctx.translate(-scrollX, 0);

    // Draw time grid across full video duration
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    const gridInterval = Math.max(
      0.5,
      Math.ceil(duration / 20),
    );
    for (let t = 0; t <= duration; t += gridInterval) {
      const x = (t / duration) * zoomedWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, tracksAreaHeight);
      ctx.stroke();

      // Time label (smaller font)
      ctx.fillStyle = "#888";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${t.toFixed(1)}s`, x, height - 2);
    }

    // Draw MIDI notes if available
    if (recordingState.midiNotes.length > 0) {
      const { midiNotes } = recordingState;

      // Get unique tracks (show all tracks, not limited to 8)
      const tracks = Array.from(
        new Set(midiNotes.map((n) => n.track)),
      ).sort((a, b) => a - b);
      const trackCount = tracks.length;
      const trackHeight = Math.min(
        TRACK_HEIGHT,
        tracksAreaHeight / trackCount,
      );

      // Track colors (cycling through hues)
      const getTrackColor = (track: number) => {
        const hue = (track * 137.5) % 360;
        return `hsl(${hue}, 70%, 60%)`;
      };

      // Draw track lanes (show all tracks)
      tracks.forEach((track, index) => {
        const y = index * trackHeight;

        // Track background
        ctx.fillStyle = index % 2 === 0 ? "#222" : "#252525";
        ctx.fillRect(0, y, zoomedWidth, trackHeight);

        // Draw notes for this track
        const trackNotes = midiNotes.filter(
          (n) => n.track === track,
        );
        trackNotes.forEach((note) => {
          const x = (note.startTime / duration) * zoomedWidth;
          const noteWidth = Math.max(
            NOTE_MIN_WIDTH,
            (note.duration / duration) * zoomedWidth,
          );
          const noteY = y + 2;
          const noteHeight = trackHeight - 4;

          // Note color based on velocity
          const alpha = 0.3 + (note.velocity / 127) * 0.7;
          const color = getTrackColor(track);
          ctx.fillStyle = color.replace(
            "60%)",
            `60%, ${alpha})`,
          );
          ctx.fillRect(x, noteY, noteWidth, noteHeight);

          // Note border
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, noteY, noteWidth, noteHeight);
        });
      });
    } else if (recordingState.isRecording) {
      // Show recording indicator
      ctx.fillStyle = "#666";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "Recording...",
        zoomedWidth / 2,
        tracksAreaHeight / 2,
      );
    }

    // Draw playhead (synced with video currentTime)
    if (currentTime >= 0 && duration > 0) {
      const playheadX = (currentTime / duration) * zoomedWidth;

      // Playhead line with drop shadow for better visibility
      ctx.shadowColor = "#00ff00";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, tracksAreaHeight);
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Playhead indicator (triangle at top)
      ctx.fillStyle = "#00ff00";
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX - 6, 10);
      ctx.lineTo(playheadX + 6, 10);
      ctx.fill();

      // Current time label (smaller font)
      ctx.fillStyle = "#00ff00";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `${currentTime.toFixed(1)}s`,
        playheadX,
        height - 2,
      );
    }

    ctx.restore();
  }, [
    recordingState,
    currentTime,
    videoDuration,
    zoomLevel,
    scrollX,
  ]);

  const hasRecording = recordingState.blobFrames.length > 0;

  return (
    <div
      className="border-t border-white/10 bg-black/50 transition-all duration-300 ease-in-out flex flex-col"
      style={{ height: isExpanded ? "320px" : "60px" }}
    >
      {/* Toolbar - Always Visible */}
      <div className="px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center gap-3 shrink-0">
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white"
          title={isExpanded ? "Collapse Timeline" : "Expand Timeline"}
        >
          {isExpanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronUp className="size-4" />
          )}
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* Recording Controls */}
        {!recordingState.isRecording ? (
          <button
            onClick={onStartRecording}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-sm font-medium transition-colors"
          >
            <Circle className="size-2 fill-red" />
            Record MIDI
          </button>
        ) : (
          <button
            onClick={onStopRecording}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Square className="size-4" />
            Stop
          </button>
        )}

        <button
          onClick={onClearRecording}
          disabled={!hasRecording}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:text-white/30 text-white rounded text-sm font-medium transition-colors disabled:cursor-not-allowed"
        >
          <RotateCcw className="size-4" />
          Clear
        </button>

        <button
          onClick={onExportMIDI}
          disabled={!hasRecording}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-white/5 disabled:text-white/30 text-white rounded text-sm font-medium transition-colors disabled:cursor-not-allowed"
        >
          <Download className="size-4" />
          Export MIDI
        </button>

        {/* Zoom Controls - Only show when expanded */}
        {isExpanded && (
          <>
            <div className="w-px h-5 bg-white/10 ml-2" />
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-1.5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-white/60 hover:text-white"
                title="Zoom Out (Ctrl+Scroll)"
              >
                <ZoomOut className="size-4" />
              </button>
              <span className="text-xs text-white/40 font-mono min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 10}
                className="p-1.5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-white/60 hover:text-white"
                title="Zoom In (Ctrl+Scroll)"
              >
                <ZoomIn className="size-4" />
              </button>
            </div>
          </>
        )}

        {/* Stats */}
        <div className="ml-auto text-sm text-white/40 font-mono flex items-center gap-4">
          {recordingState.isRecording && (
            <span className="text-red-500 animate-pulse">
              ● REC
            </span>
          )}
          {hasRecording && (
            <>
              <span className="text-xs">
                Frames: {recordingState.blobFrames.length}
              </span>
              <span className="text-xs">
                Notes: {recordingState.midiNotes.length}
              </span>
              <span className="text-xs">
                Duration: {recordingState.duration.toFixed(1)}s
              </span>
            </>
          )}
        </div>
      </div>

      {/* Timeline Canvas - Only visible when expanded */}
      {isExpanded && (
        <div
          className="flex-1 bg-black/80 overflow-hidden"
          ref={containerRef}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={1200}
            height={240}
            className="w-full h-full"
            style={{ imageRendering: "crisp-edges" }}
          />
        </div>
      )}
    </div>
  );
}
