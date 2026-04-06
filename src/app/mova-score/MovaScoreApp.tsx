import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoSource } from './components/VideoSource';
import { VideoCanvas, type RecordingCaptureRefState } from './components/VideoCanvas';
import { ControlPanel } from './components/ControlPanel';
import { Timeline } from './components/Timeline';
import { Sidebar } from './components/sidebar';
import { AnimatedGradient } from './components/animated-gradient';
import { GridPattern } from './components/grid-pattern';
import { FilmGrain } from './components/film-grain';
import { TrackingSettings, VisualSettings, SoundSettings, RecordingState } from './types';
import { generateMIDIFromBlobs } from './utils/midiGenerator';
import { downloadMIDIFile } from './utils/midiExporter';
import { Button } from './components/ui/button';
import { PanelLeftOpen } from 'lucide-react';
import Logomark from '@/assets/Logomark';
import { useAuth } from '@/app/auth/AuthProvider';
import { SignInModal } from '@/app/components/SignInModal';

interface MovaScoreAppProps {
  appMode?: 'mova-parque' | 'video-to-frames' | 'mova-score';
  onAppModeChange?: (mode: 'mova-parque' | 'video-to-frames' | 'mova-score') => void;
}

export default function MovaScoreApp({ 
  appMode, 
  onAppModeChange 
}: MovaScoreAppProps) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const { user } = useAuth();
  const [currentVideo, setCurrentVideo] = useState<{
    fileName: string;
    duration: number;
    width: number;
    height: number;
  } | null>(null);

  const recordingCaptureRef = useRef<RecordingCaptureRefState | null>(null);
  const [liveRecordingFrameCount, setLiveRecordingFrameCount] = useState(0);
  const lastTimelineTimeEmitRef = useRef(0);

  const [trackingSettings, setTrackingSettings] = useState<TrackingSettings>({
    mode: 'color',
    tolerance: 0.08,
    minBlobSize: 200,
    maxBlobSize: 6000,
    targetColor: '#9a8058'
  });

  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    showBoxes: true,
    boxType: 'corners',
    boxColor: '#949494',
    boxWeight: 2,
    boxOpacity: 1,
    
    showConnections: true,
    connectionLineStyle: 'dotted',
    connectionColor: '#b89d72',
    connectionWeight: 3,
    connectionOpacity: 1,
    
    showCentroids: true,
    centroidType: 'cross',
    centroidColor: '#b7cdc7',
    centroidSize: 6,
    centroidOpacity: 1
  });

  const [soundSettings, setSoundSettings] = useState<SoundSettings>({
    enabled: false,
    synthType: 'sawtooth',
    masterVolume: 0.5,
    attack: 0.08,
    decay: 0.08,
    sustain: 0.07,
    release: 0.10,
    maxVoices: 8,
    
    pitchEnabled: true,
    pitchMin: 48, // C3
    pitchMax: 72, // C5
    pitchInverted: true,
    scale: 'major',
    rootNote: 9, // A
    quantizeToScale: true,
    
    panEnabled: true,
    
    sizeToVelocity: true,
    velocityMin: 0.3,
    velocityMax: 1.0
  });

  // Video Upload Handlers
  const handleVideoSelect = useCallback(async (file: File) => {
    setIsVideoUploading(true);

    try {
      // Create object URL
      const objectUrl = URL.createObjectURL(file);

      // Create video element
      const video = document.createElement("video");
      video.src = objectUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      // Wait for metadata to load
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Failed to load video"));
      });

      // Start playing
      await video.play();

      // Update state
      setVideoElement(video);
      const duration = video.duration;
      setVideoDuration(isFinite(duration) && duration > 0 ? duration : 0);
      setCurrentVideo({
        fileName: file.name,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      setIsPlaying(true);
    } catch (error) {
      console.error("Error loading video:", error);
    } finally {
      setIsVideoUploading(false);
    }
  }, []);

  const handleClearVideo = useCallback(() => {
    // Clean up video resources
    if (videoElement) {
      if (videoElement.src && videoElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoElement.src);
      }
      videoElement.pause();
      videoElement.src = "";
    }

    // Reset state
    setVideoElement(null);
    setCurrentVideo(null);
    setVideoDuration(0);
    setIsPlaying(false);
  }, [videoElement]);

  // Load placeholder video on mount
  useEffect(() => {
    const loadPlaceholderVideo = async () => {
      try {
        // Create video element
        const video = document.createElement("video");
        video.src = "/videos/placeholder.mp4";
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";

        // Wait for metadata to load
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("Failed to load placeholder video"));
        });

        // Start playing
        await video.play();

        // Update state
        setVideoElement(video);
        const duration = video.duration;
        setVideoDuration(isFinite(duration) && duration > 0 ? duration : 0);
        setCurrentVideo({
          fileName: "placeholder.mp4",
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
        setIsPlaying(true);
      } catch (error) {
        console.error("Error loading placeholder video:", error);
      }
    };

    loadPlaceholderVideo();
  }, []); // Only run on mount


  // Phase 3: Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    blobFrames: [],
    midiNotes: [],
    duration: 0,
    settingsSnapshot: null
  });

  const handleStartRecording = () => {
    recordingCaptureRef.current = { active: true, frames: [] };
    setLiveRecordingFrameCount(0);
    setRecordingState({
      isRecording: true,
      blobFrames: [],
      midiNotes: [],
      duration: 0,
      settingsSnapshot: {
        tracking: trackingSettings,
        mapping: soundSettings
      }
    });

    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleStopRecording = () => {
    setRecordingState((prev) => {
      if (!prev.isRecording) return prev;

      const cap = recordingCaptureRef.current;
      const frames = cap?.frames.slice() ?? [];
      if (cap) {
        cap.active = false;
      }

      const duration = videoElement?.currentTime || 0;
      const videoSize = {
        width: videoElement?.videoWidth || 1,
        height: videoElement?.videoHeight || 1
      };

      const midiNotes = generateMIDIFromBlobs(frames, soundSettings, videoSize);

      console.log(
        `✅ Recording stopped - ${frames.length} frames, ${midiNotes.length} MIDI notes`
      );

      return {
        ...prev,
        isRecording: false,
        blobFrames: frames,
        midiNotes,
        duration
      };
    });
  };

  const handleClearRecording = () => {
    recordingCaptureRef.current = null;
    setLiveRecordingFrameCount(0);
    setRecordingState({
      isRecording: false,
      blobFrames: [],
      midiNotes: [],
      duration: 0,
      settingsSnapshot: null
    });
  };

  const handleExportMIDI = () => {
    if (recordingState.midiNotes.length === 0) {
      console.warn('No MIDI notes to export');
      return;
    }

    downloadMIDIFile(
      recordingState.midiNotes,
      {
        tempo: 120,
        ppq: 480,
        videoDuration: videoDuration
      }
    );
    
    console.log(`📥 Exported ${recordingState.midiNotes.length} MIDI notes`);
  };


  useEffect(() => {
    if (videoElement) {
      const TIMELINE_TIME_MS = 100;

      const handleTimeUpdate = () => {
        const now = performance.now();
        if (now - lastTimelineTimeEmitRef.current >= TIMELINE_TIME_MS) {
          lastTimelineTimeEmitRef.current = now;
          setCurrentTime(videoElement.currentTime);
        }
      };

      const handleSeeked = () => {
        lastTimelineTimeEmitRef.current = performance.now();
        setCurrentTime(videoElement.currentTime);
      };

      const handleLoadedMetadata = () => {
        // Webcam streams have Infinity duration, handle it
        const duration = videoElement.duration;
        if (isFinite(duration) && duration > 0) {
          setVideoDuration(duration);
          // Update currentVideo metadata if it exists
          if (currentVideo && videoElement.videoWidth && videoElement.videoHeight) {
            setCurrentVideo({
              ...currentVideo,
              duration: duration,
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
            });
          }
        } else {
          setVideoDuration(0); // Use 0 for webcam/streams
        }
      };
      
      const handleDurationChange = () => {
        const duration = videoElement.duration;
        if (isFinite(duration) && duration > 0) {
          setVideoDuration(duration);
        } else {
          setVideoDuration(0);
        }
      };
      
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      videoElement.addEventListener('seeked', handleSeeked);
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('durationchange', handleDurationChange);
      
      // Set initial duration if already loaded
      const initialDuration = videoElement.duration;
      if (isFinite(initialDuration) && initialDuration > 0 && !isNaN(initialDuration)) {
        setVideoDuration(initialDuration);
      } else {
        setVideoDuration(0);
      }
      
      return () => {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        videoElement.removeEventListener('seeked', handleSeeked);
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('durationchange', handleDurationChange);
      };
    }
  }, [videoElement, currentVideo]);


  // Load sidebar state from localStorage
  useEffect(() => {
    const savedSidebarState =
      localStorage.getItem("movaScoreSidebarOpen");
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === "true");
    }
  }, []);

  // Save sidebar state to localStorage
  const handleSidebarToggle = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem("movaScoreSidebarOpen", String(newState));
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {/* Animated Background Elements */}
      <AnimatedGradient />
      <GridPattern />
      <FilmGrain />

      {/* Toggle button when sidebar is closed */}
      {!isSidebarOpen && (
        <Button
          onClick={handleSidebarToggle}
          size="sm"
          variant="outline"
          className="fixed top-4 left-4 z-[100] bg-black/50 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/70"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={handleSidebarToggle}
        appMode={appMode}
        onAppModeChange={onAppModeChange}
        canUsePremiumExport={!!user}
        onRequestSignIn={() => setSignInModalOpen(true)}
      >
        <div className="space-y-6">
          {/* Step 1: Video Source */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-[21px] h-[21px] rounded-full bg-white/20 text-white/70 text-xs">
                1
              </div>
              <h4 className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px] underline">Upload or record video</h4>
            </div>
            <VideoSource
              onPlayPauseToggle={setIsPlaying}
              isPlaying={isPlaying}
              onVideoSelect={handleVideoSelect}
              onClearVideo={handleClearVideo}
              currentVideo={currentVideo}
              isUploading={isVideoUploading}
              videoElement={videoElement}
            />
          </div>

          {/* Step 2: Controls */}
          {videoElement && (
            <>
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-[21px] h-[21px] rounded-full bg-white/20 text-white/70 text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px] underline">Settings</h4>
                </div>
                <ControlPanel
                  trackingSettings={trackingSettings}
                  visualSettings={visualSettings}
                  soundSettings={soundSettings}
                  onTrackingSettingsChange={setTrackingSettings}
                  onVisualSettingsChange={setVisualSettings}
                  onSoundSettingsChange={setSoundSettings}
                />
              </div>
            </>
          )}
        </div>
      </Sidebar>

      <SignInModal
        open={signInModalOpen}
        onOpenChange={setSignInModalOpen}
      />

      {/* Main Preview Area - Full size (sidebar overlays; Timeline overlays from bottom); 100dvh for mobile visible viewport */}
      <main
        className="relative z-10"
        style={{
          position: "fixed",
          inset: 0,
          height: "100dvh",
          maxHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {videoElement ? (
          <div className="flex-1 min-h-0 w-full">
            <VideoCanvas
              videoElement={videoElement}
              isPlaying={isPlaying}
              trackingSettings={trackingSettings}
              visualSettings={visualSettings}
              soundSettings={soundSettings}
              recordingCaptureRef={recordingCaptureRef}
              onRecordingFrameCount={setLiveRecordingFrameCount}
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
          >
            <div
              style={{
                textAlign: "center",
                maxWidth: "390px",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  margin: "0 auto 16px",
                }}
              >
                <Logomark />
              </div>
              <h2 className="text-white text-sm font-medium mb-1">Motion Scores</h2>
              <span
                className="text-xs font-thin text-white/40 mb-3 block"
              >
                by Mova Atlética
              </span>
              <p className="text-xs text-white/50">
                Analyze video and convert motion into
                MIDI files. Configure the video tracking
                sensitivity and musical properties of the MIDI output.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Timeline - Fixed overlay at bottom; width adjusts so it never overlaps sidebar (z-40, below sidebar z-50) */}
      {videoElement && (
        <div
          className="fixed bottom-0 right-0 z-40 transition-[left] duration-300 ease-out"
          style={{ left: isSidebarOpen ? 400 : 0 }}
        >
          <Timeline
            recordingState={recordingState}
            liveRecordingFrameCount={liveRecordingFrameCount}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onClearRecording={handleClearRecording}
            onExportMIDI={handleExportMIDI}
            currentTime={currentTime}
            videoDuration={videoDuration}
          />
        </div>
      )}
    </div>
  );
}
