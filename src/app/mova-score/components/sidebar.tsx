import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, MoreVertical, Music, Sparkles, Film, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  footer?: ReactNode;
  appMode?: 'mova-parque' | 'video-to-frames' | 'mova-score';
  onAppModeChange?: (mode: 'mova-parque' | 'video-to-frames' | 'mova-score') => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  children,
  footer,
  appMode,
  onAppModeChange,
}: SidebarProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const slides = [
    {
      title: "How It Works",
      content: "Upload a video and Motion Scores detects movement blobs. Each blob's position, size, and motion are mapped to MIDI parameters—pitch, velocity, and pan—creating a musical sequence from visual motion.",
    },
    {
      title: "Export & Use",
      content: "Record the MIDI sequence as blobs move through your video. Export the MIDI file and import it into your DAW (Ableton, Logic, FL Studio, etc.) to use as a foundation for your music production.",
    },
  ];

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <>
      {/* Sidebar Panel */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed left-0 top-0 bottom-0 w-full max-w-[400px] bg-black/40 backdrop-blur-xl border-r border-white/10 overflow-y-auto control-panel-scroll z-50 lg:w-[400px]"
          >
            <div className="p-4 md:p-8 space-y-5">
              {/* Header with toggle button */}
              <div className="space-y-2 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-md font-thin tracking-wider text-white/60 uppercase">
                      Motion Scores
                    </h1>
                    <p className="text-xs text-white/40 leading-relaxed mt-0">
                    Transform videos into midi sequences for sound design.{" "}
                    <button
                      onClick={() => setIsGuideOpen(true)}
                      className="text-[12px] font-thin text-white/60 hover:text-white underline underline-offset-2 decoration-white/30 hover:decoration-white/60 transition-all"
                    >
                      Read our usage guide.
                    </button>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* App Menu */}
                    {appMode !== undefined && onAppModeChange && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all flex-shrink-0"
                            title="Apps & Settings"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end" 
                          className="w-56 bg-black/90 backdrop-blur-xl border border-white/10"
                        >
                          <DropdownMenuLabel className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px]">
                            Apps
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onAppModeChange('mova-parque')}
                            className={`text-white/70 focus:text-white focus:bg-white/10 ${
                              appMode === 'mova-parque' ? 'bg-white/5' : ''
                            }`}
                          >
                            <Sparkles className="size-4 mr-2" />
                            <span>Mova Parque</span>
                            {appMode === 'mova-parque' && (
                              <span className="ml-auto text-xs text-white/40">✓</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onAppModeChange('video-to-frames')}
                            className={`text-white/70 focus:text-white focus:bg-white/10 ${
                              appMode === 'video-to-frames' ? 'bg-white/5' : ''
                            }`}
                          >
                            <Film className="size-4 mr-2" />
                            <span>Video to Frames</span>
                            {appMode === 'video-to-frames' && (
                              <span className="ml-auto text-xs text-white/40">✓</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onAppModeChange('mova-score')}
                            className={`text-white/70 focus:text-white focus:bg-white/10 ${
                              appMode === 'mova-score' ? 'bg-white/5' : ''
                            }`}
                          >
                            <Music className="size-4 mr-2" />
                            <span>Motion Scores</span>
                            {appMode === 'mova-score' && (
                              <span className="ml-auto text-xs text-white/40">✓</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuLabel className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px]">
                            Account
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled
                            className="text-white/40 cursor-not-allowed"
                          >
                            <span className="text-xs">Coming soon</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {/* Close button */}
                    <button
                      onClick={onToggle}
                      className="bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all flex-shrink-0"
                      title="Close panel"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              {children}

              {/* Footer */}
              {footer && (
                <div className="pt-5 border-t border-white/10">
                  {footer}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="lg:hidden"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 40,
            }}
          />
        )}
      </AnimatePresence>

      {/* Explainer Guide Modal */}
      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent
          style={{
            maxWidth: "600px",
            maxHeight: "90vh",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
          }}
          className="bg-black/95 border-white/10"
        >
          <DialogHeader>
            <DialogTitle className="text-white">
              Motion Scores Usage Guide
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Learn how to transform video motion into MIDI sequences
            </DialogDescription>
          </DialogHeader>

          <div
            className="space-y-4"
            style={{
              marginTop: "16px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {/* Slide Content */}
            <div className="space-y-3 min-h-[200px]">
              <h3 className="text-sm font-medium text-white/70">
                {slides[currentSlide].title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {slides[currentSlide].content}
              </p>
            </div>

            {/* Navigation */}
            {slides.length > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-1">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentSlide
                          ? 'bg-white/60 w-6'
                          : 'bg-white/20 w-1.5'
                      }`}
                      title={`Slide ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrev}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white"
                    title="Previous"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white"
                    title="Next"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
