import { useRef } from 'react';
import { VideoUpload } from './VideoUpload';

interface VideoSourceProps {
  onPlayPauseToggle: (isPlaying: boolean) => void;
  isPlaying: boolean;
  onVideoSelect: (file: File) => void;
  onClearVideo: () => void;
  currentVideo: {
    fileName: string;
    duration: number;
    width: number;
    height: number;
  } | null;
  isUploading: boolean;
  videoElement: HTMLVideoElement | null;
}

export function VideoSource({
  onPlayPauseToggle,
  isPlaying,
  onVideoSelect,
  onClearVideo,
  currentVideo,
  isUploading,
  videoElement,
}: VideoSourceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle play/pause for uploaded videos
  const handlePlayPause = async () => {
    if (!videoElement) return;
    
    if (isPlaying) {
      videoElement.pause();
      onPlayPauseToggle(false);
    } else {
      try {
        await videoElement.play();
        onPlayPauseToggle(true);
      } catch (error) {
        console.error('Error playing video:', error);
      }
    }
  };

  return (
    <div className="space-y-4">

      {/* Video Upload Component */}
      <div className="space-y-2">
        <VideoUpload
          onVideoSelect={onVideoSelect}
          onClearVideo={onClearVideo}
          currentVideo={currentVideo}
          isUploading={isUploading}
        />
      </div>

      {/* Play/Pause Control (for uploaded videos only) */}
      {currentVideo && videoElement && (
        <div className="space-y-2">
          <button
            onClick={handlePlayPause}
            className="w-full px-3 py-2 rounded-lg text-xs font-light transition-all border bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 hover:border-white/20"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      )}

      {/* Hidden video element */}
      <video 
        ref={videoRef} 
        className="hidden" 
        playsInline 
        loop 
        muted 
      />
    </div>
  );
}
