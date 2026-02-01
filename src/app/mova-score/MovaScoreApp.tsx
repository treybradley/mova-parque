import { useState, useEffect, useCallback } from 'react';
import { VideoSource } from './components/VideoSource';
import { VideoCanvas } from './components/VideoCanvas';
import { ControlPanel } from './components/ControlPanel';
import { Timeline } from './components/Timeline';
import { Sidebar } from './components/sidebar';
import { AnimatedGradient } from './components/animated-gradient';
import { GridPattern } from './components/grid-pattern';
import { FilmGrain } from './components/film-grain';
import { TrackingSettings, VisualSettings, SoundSettings, RecordingState, BlobFrame } from './types';
import { generateMIDIFromBlobs } from './utils/midiGenerator';
import { downloadMIDIFile } from './utils/midiExporter';
import { Button } from './components/ui/button';
import { PanelLeftOpen } from 'lucide-react';
import Logomark from '@/assets/Logomark';

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
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<{
    fileName: string;
    duration: number;
    width: number;
    height: number;
  } | null>(null);

  const [trackingSettings, setTrackingSettings] = useState<TrackingSettings>({
    mode: 'edge',
    tolerance: 0.06,
    minBlobSize: 150,
    maxBlobSize: 1000,
    targetColor: '#ff0000'
  });

  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    showBoxes: true,
    boxType: 'corners',
    boxColor: '#949494',
    boxWeight: 2,
    boxOpacity: 1,
    
    showConnections: true,
    connectionLineStyle: 'dotted',
    connectionColor: '#707066',
    connectionWeight: 1,
    connectionOpacity: 1,
    
    showCentroids: true,
    centroidType: 'cross',
    centroidColor: '#00e1ff',
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
    // Clear previous recording and start new
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
    
    // Start video playback if not already playing
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleStopRecording = () => {
    if (!recordingState.isRecording) return;

    const duration = videoElement?.currentTime || 0;
    const videoSize = {
      width: videoElement?.videoWidth || 1,
      height: videoElement?.videoHeight || 1
    };

    // Generate MIDI notes from recorded blob frames
    const midiNotes = generateMIDIFromBlobs(
      recordingState.blobFrames,
      soundSettings,
      videoSize
    );

    setRecordingState({
      ...recordingState,
      isRecording: false,
      midiNotes,
      duration
    });
    
    console.log(`✅ Recording stopped - ${recordingState.blobFrames.length} frames, ${midiNotes.length} MIDI notes`);
  };

  const handleClearRecording = () => {
    setRecordingState({
      isRecording: false,
      blobFrames: [],
      midiNotes: [],
      duration: 0,
      settingsSnapshot: null
    });
  };

  const handleBlobFrameCapture = (frame: BlobFrame) => {
    if (recordingState.isRecording) {
      setRecordingState(prev => ({
        ...prev,
        blobFrames: [...prev.blobFrames, frame]
      }));
    }
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
      const handleTimeUpdate = () => {
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
    <div className="relative w-full h-screen overflow-hidden bg-black">
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

      {/* Main Preview Area - Full Height */}
      <main
        className="relative z-10"
        style={{
          minHeight: "100vh",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          paddingLeft: isSidebarOpen ? "400px" : "0",
          transition: "padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}
      >
        {videoElement ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Video Canvas - Takes remaining space */}
            <div className="flex-1 min-h-0">
              <VideoCanvas
                videoElement={videoElement}
                isPlaying={isPlaying}
                trackingSettings={trackingSettings}
                visualSettings={visualSettings}
                soundSettings={soundSettings}
                isRecording={recordingState.isRecording}
                onBlobFrameCapture={handleBlobFrameCapture}
              />
            </div>

            {/* Timeline Drawer */}
            <Timeline
              recordingState={recordingState}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onClearRecording={handleClearRecording}
              onExportMIDI={handleExportMIDI}
              currentTime={currentTime}
              videoDuration={videoDuration}
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
    </div>
  );
}
