import { Upload, Video, X } from "lucide-react";
import { useRef, useState } from "react";

interface VideoUploadProps {
  onVideoSelect: (file: File) => void;
  onClearVideo: () => void;
  currentVideo: {
    fileName: string;
    duration: number;
    width: number;
    height: number;
  } | null;
  isUploading: boolean;
}

interface ValidationError {
  type: "format" | "size" | "duration" | "corrupt";
  message: string;
}

export function VideoUpload(props: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<ValidationError | null>(null);

  const ACCEPTED_FORMATS = ["video/mp4", "video/webm", "video/quicktime"];
  const MAX_FILE_SIZE = 130 * 1024 * 1024; // 130MB in bytes
  const MAX_DURATION = 30; // 30 seconds

  const validateVideo = async (file: File): Promise<boolean> => {
    // Check format
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setError({
        type: "format",
        message: "Please upload MP4, WebM, or MOV format.",
      });
      return false;
    }

    // Check size
    if (file.size > MAX_FILE_SIZE) {
      setError({
        type: "size",
        message: "Video must be under 130MB. Try compressing or trimming it.",
      });
      return false;
    }

    // Check duration by creating a temporary video element
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);

        if (video.duration > MAX_DURATION) {
          setError({
            type: "duration",
            message: `Video must be 30 seconds or less. This video is ${Math.round(video.duration)}s.`,
          });
          resolve(false);
        } else if (video.videoWidth === 0 || video.videoHeight === 0) {
          setError({
            type: "corrupt",
            message: "This file doesn't contain video.",
          });
          resolve(false);
        } else {
          setError(null);
          resolve(true);
        }
      };

      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        setError({
          type: "corrupt",
          message: "Couldn't read video file. Try a different one.",
        });
        resolve(false);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    const isValid = await validateVideo(file);
    if (isValid) {
      props.onVideoSelect(file);
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatDuration = (seconds: number): string => {
    return `${Math.round(seconds)}s`;
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {!props.currentVideo ? (
        // Upload state
        <>
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={`
              relative rounded-md border-2 border-dashed transition-all cursor-pointer
              ${
                isDragging
                  ? "border-white/50 bg-white/10"
                  : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/8"
              }
              ${props.isUploading ? "pointer-events-none opacity-50" : ""}
            `}
          >
            <div className="p-4 flex flex-col items-center gap-2 text-center">
              {props.isUploading ? (
                <>
                  <Video className="w-6 h-6 text-white/40 animate-pulse" />
                  <p className="text-[11px] text-white/60 font-light">
                    Loading video...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-white/40" />
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-white/70 font-light">
                      Drop video or click to browse
                    </p>
                    <p className="text-[9px] text-white/40 font-light">
                      MP4, WebM, MOV • 130MB max • 30s max
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2.5">
              <p className="text-[10px] text-red-300/90 leading-relaxed font-light">
                {error.message}
              </p>
            </div>
          )}
        </>
      ) : (
        // Video loaded state
        <div className="rounded-md bg-white/5 border border-white/10 p-2.5">
          <div className="flex items-start gap-2.5">
            <Video className="w-4 h-4 text-white/60 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/80 font-light truncate">
                {props.currentVideo.fileName}
              </p>
              <div className="flex items-center gap-2.5 mt-0.5">
                <span className="text-[9px] text-white/40 font-light">
                  {props.currentVideo.width} × {props.currentVideo.height}
                </span>
                <span className="text-[9px] text-white/40 font-light">
                  {formatDuration(props.currentVideo.duration)}
                </span>
              </div>
            </div>
            <button
              onClick={props.onClearVideo}
              className="p-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
              title="Clear video"
            >
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}