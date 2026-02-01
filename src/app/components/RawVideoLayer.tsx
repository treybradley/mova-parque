import { useRef, useEffect, useState } from 'react';

interface RawVideoLayerProps {
  videoSource: HTMLVideoElement | null;
  opacity: number;
  enabled: boolean;
}

export function RawVideoLayer({ videoSource, opacity, enabled }: RawVideoLayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!enabled || !videoSource || !containerRef.current) return;

    // Sync the display video with the original
    // We create a copy for display but keep it in sync
    if (videoRef.current && videoRef.current.src !== videoSource.src) {
      videoRef.current.src = videoSource.src;
      videoRef.current.loop = videoSource.loop;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch(err => {
        console.error('RawVideoLayer play error:', err);
      });
    }
    
    // Sync currentTime from original to display copy
    const syncTime = () => {
      if (videoRef.current && videoSource) {
        const timeDiff = Math.abs(videoRef.current.currentTime - videoSource.currentTime);
        if (timeDiff > 0.1) {
          videoRef.current.currentTime = videoSource.currentTime;
        }
      }
    };
    
    // Sync on timeupdate of original video
    videoSource.addEventListener('timeupdate', syncTime);
    
    return () => {
      videoSource.removeEventListener('timeupdate', syncTime);
    };
  }, [enabled, videoSource]);

  useEffect(() => {
    if (!enabled || !videoSource || !containerRef.current) return;

    // Update container size: aspect ratio for uploaded video
    const updateSize = () => {
      const videoElement = videoRef.current || videoSource;
      
      if (!videoElement || !containerRef.current) return;
      
      const viewportHeight = window.innerHeight;
      
      // Uploaded video: aspect ratio sizing
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;
      const videoAspect = videoWidth / videoHeight;
      
      const containerHeight = viewportHeight;
      const containerWidth = containerHeight * videoAspect;
      
      setContainerSize({ width: containerWidth, height: containerHeight });
      
      // Update container positioning (centered)
      containerRef.current.style.position = 'fixed';
      containerRef.current.style.top = '0';
      containerRef.current.style.left = '50%';
      containerRef.current.style.transform = 'translateX(-50%)';
    };

    // Update size when video metadata loads
    const handleLoadedMetadata = () => {
      updateSize();
    };
    
    const videoElement = videoRef.current || videoSource;
    
    if (videoElement) {
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    }
    updateSize(); // Also call immediately in case metadata is already loaded
    
    // Update on resize
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [enabled, videoSource]);

  if (!videoSource) return null;

  return (
    <div 
      ref={containerRef}
      className="pointer-events-none z-[2]"
      style={{
        width: containerSize.width > 0 ? `${containerSize.width}px` : '100vw',
        height: containerSize.height > 0 ? `${containerSize.height}px` : '100vh',
      }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity,
          objectFit: 'contain',
        }}
        loop
        playsInline
        muted
        autoPlay
      />
    </div>
  );
}
