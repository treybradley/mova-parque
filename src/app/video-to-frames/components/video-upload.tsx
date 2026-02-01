import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Upload, Video, X } from "lucide-react";

interface VideoUploadProps {
  onVideoUpload: (
    file: File,
    url: string,
    duration: number,
    fps: number,
  ) => void;
}

export function VideoUpload({
  onVideoUpload,
}: VideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      // Clean up previous URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(url);
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current && selectedFile && previewUrl) {
      const duration = videoRef.current.duration;
      const fps = 30; // Default FPS, could be detected with more advanced methods
      onVideoUpload(selectedFile, previewUrl, duration, fps);
    }
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        id="video-upload"
      />

      {!selectedFile ? (
        <label htmlFor="video-upload">
          <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-white/30 bg-white/5">
            <Upload className="size-6 mx-auto mb-2 text-white/60" />
            <p className="text-[11px] text-white/70 font-light">Click to upload video</p>
            <p className="text-[9px] text-white/40 font-light">
              MP4, MOV, or WebM
            </p>
          </div>
        </label>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <Video className="size-5 shrink-0 text-white/70" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-white/40">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="size-4" />
            </Button>
          </div>

          {previewUrl && (
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              onLoadedMetadata={handleVideoLoaded}
              className="w-full rounded-lg bg-black/20 border border-white/10"
              style={{ maxHeight: "200px" }}
            />
          )}
        </div>
      )}
    </div>
  );
}