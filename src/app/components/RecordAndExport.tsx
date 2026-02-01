import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { ExportFrameRate, ExportQualityPreset } from "@/app/recording";

interface RecordAndExportProps {
  hasVideoSource: boolean;
  isRecording: boolean;
  recordingStartTime: number | null;
  exportFrameRate: ExportFrameRate;
  onExportFrameRateChange: (rate: ExportFrameRate) => void;
  exportQualityPreset: ExportQualityPreset;
  onExportQualityPresetChange: (preset: ExportQualityPreset) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RecordAndExport({
  hasVideoSource,
  isRecording,
  recordingStartTime,
  exportFrameRate,
  onExportFrameRateChange,
  exportQualityPreset,
  onExportQualityPresetChange,
  onStartRecording,
  onStopRecording,
}: RecordAndExportProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isRecording || recordingStartTime == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRecording, recordingStartTime]);
  const recordingDurationMs =
    isRecording && recordingStartTime != null ? now - recordingStartTime : 0;

  return (
    <div className="space-y-3">
      {!hasVideoSource && (
        <p className="text-xs text-white/40">
          Upload a video or use webcam to record.
        </p>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs font-normal text-white/60">Frame rate</Label>
          <Select
            value={String(exportFrameRate)}
            onValueChange={(v) => onExportFrameRateChange(Number(v) as ExportFrameRate)}
          >
            <SelectTrigger className="h-8 rounded-lg border-white/10 bg-white/5 text-xs font-light text-white data-[placeholder]:text-white/60 [&_svg]:text-white/80">
              <SelectValue placeholder="Frame rate" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#2a2d2f] text-white">
              <SelectItem value="30" className="text-white focus:bg-white/15 focus:text-white">
                30 fps
              </SelectItem>
              <SelectItem value="60" className="text-white focus:bg-white/15 focus:text-white">
                60 fps
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs font-normal text-white/60">Quality</Label>
          <Select
            value={exportQualityPreset}
            onValueChange={(v) => onExportQualityPresetChange(v as ExportQualityPreset)}
          >
            <SelectTrigger className="h-8 rounded-lg border-white/10 bg-white/5 text-xs font-light text-white data-[placeholder]:text-white/60 [&_svg]:text-white/80">
              <SelectValue placeholder="Quality" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#2a2d2f] text-white">
              <SelectItem value="standard" className="text-white focus:bg-white/15 focus:text-white">
                Standard
              </SelectItem>
              <SelectItem value="high" className="text-white focus:bg-white/15 focus:text-white">
                High
              </SelectItem>
              <SelectItem value="max" className="text-white focus:bg-white/15 focus:text-white">
                Max
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            onClick={onStartRecording}
            disabled={!hasVideoSource}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-light transition-all border ${
              hasVideoSource
                ? "bg-red-500/20 text-red-200 border-red-400/30 hover:bg-red-500/30"
                : "bg-white/5 text-white/40 border-white/10 cursor-not-allowed"
            }`}
          >
            Record
          </button>
        ) : (
          <>
            <button
              onClick={onStopRecording}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-light bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-all"
            >
              Stop
            </button>
            <span className="text-xs text-white/50 tabular-nums min-w-[3ch]">
              {formatDuration(recordingDurationMs)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
