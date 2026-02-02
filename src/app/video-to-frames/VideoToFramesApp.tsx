import { useState, useEffect, useRef } from "react";
import { VideoUpload } from "./components/video-upload";
import { FrameExtractor } from "./components/frame-extractor";
import { PageSettings } from "./components/page-settings";
import {
  PagePreview,
  PagePreviewHandle,
} from "./components/page-preview";
import { FrameManager } from "./components/frame-manager";
import { Sidebar } from "./components/sidebar";
import { FilmGrain } from "./components/film-grain";
import { AnimatedGradient } from "./components/animated-gradient";
import { GridPattern } from "./components/grid-pattern";
import { InstructionsModal } from "./components/instructions-modal";
import { Separator } from "./components/ui/separator";
import { Button } from "./components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import {
  PanelLeftOpen,
  Info,
  Printer,
  Download,
  FileDown,
  Ruler,
} from "lucide-react";
import Logomark from "@/assets/Logomark";

export interface PageConfig {
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
  preset: string;
  gridRows: number;
  gridCols: number;
  margin: number;
  spacing: number;
  showFrameNumbers: boolean;
  frameNumberPosition:
    | "bottom-center"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  showTimecodes: boolean;
  showRegistrationMarks: boolean;
  showCutGuides: boolean;
  blackAndWhite: boolean;
  contrast: number;
  cropAspectRatio: string;
}

export interface ExtractedFrame {
  id: string;
  dataUrl: string;
  timestamp: number;
  frameNumber: number;
}

interface VideoToFramesAppProps {
  appMode?: 'mova-parque' | 'video-to-frames' | 'mova-score';
  onAppModeChange?: (mode: 'mova-parque' | 'video-to-frames' | 'mova-score') => void;
}

export default function VideoToFramesApp({ 
  appMode, 
  onAppModeChange 
}: VideoToFramesAppProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoFPS, setVideoFPS] = useState(30);
  const [allFrames, setAllFrames] = useState<ExtractedFrame[]>(
    [],
  );
  const [selectedFrames, setSelectedFrames] = useState<
    ExtractedFrame[]
  >([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInstructionsOpen, setIsInstructionsOpen] =
    useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [rulerUnit, setRulerUnit] = useState<"in" | "cm">("in");
  const [pageConfig, setPageConfig] = useState<PageConfig>({
    width: 210,
    height: 297,
    orientation: "portrait",
    preset: "A4",
    gridRows: 4,
    gridCols: 3,
    margin: 10,
    spacing: 5,
    showFrameNumbers: true,
    frameNumberPosition: "bottom-center",
    showTimecodes: false,
    showRegistrationMarks: false,
    showCutGuides: false,
    blackAndWhite: false,
    contrast: 100,
    cropAspectRatio: "16:9",
  });

  const pagePreviewRef = useRef<PagePreviewHandle>(null);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedSidebarState =
      localStorage.getItem("videoToFramesSidebarOpen");
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === "true");
    }
  }, []);

  // Save sidebar state to localStorage
  const handleSidebarToggle = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem("videoToFramesSidebarOpen", String(newState));
  };

  const handleVideoUpload = (
    _file: File,
    url: string,
    duration: number,
    fps: number,
  ) => {
    setVideoUrl(url);
    setVideoDuration(duration);
    setVideoFPS(fps);
    setAllFrames([]);
    setSelectedFrames([]);
  };

  const handleFramesExtracted = (
    extractedFrames: ExtractedFrame[],
  ) => {
    setAllFrames(extractedFrames);
    setSelectedFrames(extractedFrames);
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-black"
    >
      {/* Animated Background Elements */}
      <AnimatedGradient />
      <GridPattern />
      <FilmGrain />

      {/* Instructions Modal */}
      <InstructionsModal
        isOpen={isInstructionsOpen}
        onOpenChange={setIsInstructionsOpen}
      />

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
        onOpenInstructions={() => setIsInstructionsOpen(true)}
        appMode={appMode}
        onAppModeChange={onAppModeChange}
        footer={
          allFrames.length > 0 ? (
            <div className="space-y-3">
              {/* Ruler Controls - Condensed */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  onClick={() => setShowRulers(!showRulers)}
                  variant={showRulers ? "default" : "outline"}
                  size="sm"
                  style={{ flex: 1 }}
                  className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"
                >
                  <Ruler className="size-4 mr-1" />
                  {showRulers ? "Hide Rulers" : "Rulers"}
                </Button>

                {showRulers && (
                  <div className="flex items-center gap-1 rounded-md border border-white/10 p-0.5 bg-white/5">
                    <button
                      onClick={() => setRulerUnit("in")}
                      className={`px-2.5 py-1 rounded-sm text-xs transition-all ${
                        rulerUnit === "in"
                          ? "bg-white/20 text-white"
                          : "bg-transparent text-white/40 hover:text-white/60"
                      }`}
                    >
                      in
                    </button>
                    <button
                      onClick={() => setRulerUnit("cm")}
                      className={`px-2.5 py-1 rounded-sm text-xs transition-all ${
                        rulerUnit === "cm"
                          ? "bg-white/20 text-white"
                          : "bg-transparent text-white/40 hover:text-white/60"
                      }`}
                    >
                      cm
                    </button>
                  </div>
                )}

                {/* Preview Info */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80">
                      <Info className="size-4 mr-1" />
                      Details
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="end"
                    className="w-80 bg-black/90 backdrop-blur-xl border-white/10"
                  >
                    <InfoCardContent
                      frames={selectedFrames}
                      config={pageConfig}
                      previewRef={pagePreviewRef}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Export Actions - Grid */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() =>
                    pagePreviewRef.current?.print()
                  }
                  variant="outline"
                  size="sm"
                  className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 justify-center"
                >
                  <Printer className="size-4 mr-1" />
                  Print
                </Button>

                <Button
                  onClick={() =>
                    pagePreviewRef.current?.downloadPage()
                  }
                  variant="outline"
                  size="sm"
                  className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 justify-center"
                >
                  <Download className="size-4 mr-1" />
                  PNG
                </Button>

                <Button
                  onClick={() =>
                    pagePreviewRef.current?.downloadAllPages()
                  }
                  variant="outline"
                  size="sm"
                  className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 justify-center"
                >
                  <Download className="size-4 mr-1" />
                  All
                </Button>

                <Button
                  onClick={() =>
                    pagePreviewRef.current?.downloadPDF()
                  }
                  variant="default"
                  size="sm"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30 justify-center"
                >
                  <FileDown className="size-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-6">
          {/* Step 1: Video Upload */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-[21px] h-[21px] rounded-full bg-white/20 text-white/70 text-xs">
                1
              </div>
              <h4 className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px] underline">Upload Video</h4>
            </div>
            <VideoUpload onVideoUpload={handleVideoUpload} />
          </div>

          {/* Step 2: Extract Frames */}
          {videoUrl && (
            <>
              <Separator className="bg-white/10" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-[21px] h-[21px] rounded-full bg-white/20 text-white/70 text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px] underline">Extract Frames</h4>
                </div>
                <FrameExtractor
                  videoUrl={videoUrl}
                  videoDuration={videoDuration}
                  videoFPS={videoFPS}
                  onFramesExtracted={handleFramesExtracted}
                />
              </div>
            </>
          )}

          {/* Step 3: Configure & Manage */}
          {allFrames.length > 0 && (
            <>
              <Separator className="bg-white/10" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-[21px] h-[21px] rounded-full bg-white/20 text-white/70 text-xs">
                    3
                  </div>
                  <h4 className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px] underline">Configure</h4>
                </div>
                <Tabs defaultValue="layout">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
                    <TabsTrigger value="layout" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60">
                      Layout
                    </TabsTrigger>
                    <TabsTrigger value="frames" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60">
                      Frames
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="layout" className="mt-4">
                    <PageSettings
                      config={pageConfig}
                      onConfigChange={setPageConfig}
                      totalFrames={selectedFrames.length}
                    />
                  </TabsContent>

                  <TabsContent value="frames" className="mt-4">
                    <FrameManager
                      allFrames={allFrames}
                      selectedFrames={selectedFrames}
                      onSelectedFramesChange={setSelectedFrames}
                    />
                  </TabsContent>
                </Tabs>
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
          overflow: "auto",
        }}
      >
        {selectedFrames.length > 0 ? (
          <div
            className="p-4 sm:p-6 md:p-8 lg:p-8"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Preview Component - Full Height */}
            <div style={{ flex: 1 }}>
              <PagePreview
                ref={pagePreviewRef}
                frames={selectedFrames}
                config={pageConfig}
                videoFPS={videoFPS}
                showRulers={showRulers}
                rulerUnit={rulerUnit}
              />
            </div>
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
              <h2 className="text-white text-sm font-medium mb-1">Video to Frames</h2>
              <span
                className="text-xs font-thin text-white/40 mb-3 block"
              >
                by Mova Atlética
              </span>
              <p className="text-xs text-white/50">
                Extract and lay out the frames of a video in a customized grid.
                Configure grid dimensions and page layout to your printing needs for stop-motion animation.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Info Card Component for Popover
function InfoCardContent({
  frames,
  config,
  previewRef: _previewRef,
}: {
  frames: ExtractedFrame[];
  config: PageConfig;
  previewRef: React.RefObject<PagePreviewHandle>;
}) {
  const totalFrames = frames.length;
  const framesPerPage = config.gridRows * config.gridCols;
  const totalPages = Math.ceil(totalFrames / framesPerPage);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <InfoCard label="Total Frames" value={totalFrames} />
        <InfoCard label="Total Pages" value={totalPages} />
        <InfoCard label="Frames/Page" value={framesPerPage} />
        <InfoCard
          label="Grid Size"
          value={`${config.gridRows}×${config.gridCols}`}
        />
      </div>

      <div
        className="p-3 rounded-lg space-y-2 bg-white/5 border border-white/10"
      >
        <h4 className="text-white/70">Page Specifications</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-white/50">
          <div>
            <span>Size:</span> {config.preset}
          </div>
          <div>
            <span>Orient:</span> {config.orientation}
          </div>
          <div>
            <span>Dims:</span> {config.width}×{config.height}mm
          </div>
          <div>
            <span>Margin:</span> {config.margin}mm
          </div>
        </div>
      </div>

      <div
        className="p-3 rounded-lg bg-white/10 border border-white/20"
      >
        <h4 className="mb-2 text-white/70">💡 Printing Tips</h4>
        <ul className="text-xs text-white/50 space-y-1">
          <li>• Set printer to actual size (100% scale)</li>
          <li>• Disable "Fit to page" option</li>
          <li>• Use high-quality paper</li>
          <li>• Print in color for frame numbers</li>
        </ul>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div
      className="p-4 rounded-lg bg-white/5 border border-white/10"
    >
      <p
        className="text-xs text-white/50 mb-1"
      >
        {label}
      </p>
      <h3 className="text-white">{value}</h3>
    </div>
  );
}
