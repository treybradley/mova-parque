import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

interface PitchDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PitchDeckModal({
  isOpen,
  onClose,
}: PitchDeckModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // Slide 1: Quick Start
    {
      title: "Quick Start",
      subtitle: "Get Up and Running",
      content: (
        <div className="space-y-8">
          <p className="text-xl leading-relaxed text-white/90">
            A real-time visual system that creates atmospheric
            effects and responds to movement through your webcam
            or uploaded videos.
          </p>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-[21px] h-[21px] rounded-full bg-white/20 text-white/70 text-xs">
                1
              </div>
              <div>
                <h4 className="text-white/70 mb-1">Choose Your Video Source</h4>
                <p className="text-white/40 text-sm">
                  Upload a video file or use your{" "}
                  <span className="text-white/70">webcam</span>{" "}
                  for real-time effects
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-[21px] h-[21px] rounded-full bg-white/20 text-white/70 text-xs">
                2
              </div>
              <div>
                <h4 className="text-white/70 mb-1">Explore the Sections</h4>
                <p className="text-white/40 text-sm">
                  Open{" "}
                  <span className="text-white/70">
                    Motion Trails, Motion Analysis,
                  </span>{" "}
                  <span className="text-white/70">The Trippy Section</span>,{" "}
                  <span className="text-white/70">Grid Background</span>,{" "}
                  and <span className="text-white/70">Post Processing</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-[21px] h-[21px] rounded-full bg-white/20 text-white/70 text-xs">
                3
              </div>
              <div>
                <h4 className="text-white/70 mb-1">Experiment!</h4>
                <p className="text-white/40 text-sm">
                  All changes happen instantly — move sliders
                  and see what happens in real-time. We use machine-learning libraries to drive the visual tools
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/10 border border-white/10 rounded-lg mt-6">
            <h4 className="text-white/70 mb-2">Pro Tip</h4>
            <p className="text-white/40 text-sm leading-relaxed">
              Start by adjusting the background visuals first, then
              enable body effects and motion trails. Uploaded videos
              unlock advanced features like Motion Analysis.
            </p>
          </div>
        </div>
      ),
    },

    // Slide 2: Understanding Controls
    {
      title: "Understanding Controls",
      subtitle: "What Everything Does",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white/70 font-sm mb-3">Motion Trails</h4>
                <div className="space-y-2 text-xs">
                  <div className="text-white/40">
                    <span className="text-white/70">Ghost Trail:</span>{" "}
                    Motion echo intensity
                  </div>
                  <div className="text-white/40">
                    <span className="text-white/70">Ghost Frames:</span>{" "}
                    Number of trail frames (3-90)
                  </div>
                  <div className="text-white/40">
                    <span className="text-white/70">Ghost Decay:</span>{" "}
                    How quickly trails fade
                  </div>
                  <div className="text-white/40">
                    <span className="text-white/70">Live Person Visibility:</span>{" "}
                    Current frame opacity
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white/70 font-sm mb-3">Motion Analysis</h4>
                <div className="space-y-2 text-xs">
                  <div className="text-white/40">
                    <span className="text-white/70">Skeleton:</span>{" "}
                    Pose estimation overlay (uploaded videos only)
                  </div>
                  <div className="text-white/40">
                    <span className="text-white/70">Joint Angles:</span>{" "}
                    Display joint measurements
                  </div>
                  <div className="text-white/40">
                    <span className="text-white/70">ROM:</span>{" "}
                    Range of motion tracking
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white/70 font-sm mb-3">The Trippy Section</h4>
                <div className="space-y-2 text-xs">
                  <div className="text-white/40">
                    <span className="text-white/70">Kaleidoscope:</span>{" "}
                    Mirror effects (none, horizontal, vertical, radial)
                  </div>
                  <div className="text-white/40">
                    <span className="text-white/70">Blob Tracking:</span>{" "}
                    Motion detection with bounding boxes & connections
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white/70 font-sm mb-3">Grid Background</h4>
                <div className="space-y-2 text-xs">
                  <div className="text-white/40">
                    <span className="text-white/70">Styles:</span>{" "}
                    Square, Isometric, Polar, Dots
                  </div>
                  <div className="text-white/40">
                    <span className="text-white/70">Customizable:</span>{" "}
                    Size, color, opacity, line width
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white/70 font-sm mb-3">Background Atmosphere</h4>
                <div className="space-y-2 text-xs">
                  <div className="text-white/40">
                    <span className="text-white/70">GLSL Shaders:</span>{" "}
                    Custom shader backgrounds (toggle off Original Video to see)
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white/70 font-sm mb-3">Post Processing</h4>
                <div className="space-y-2 text-xs">
                  <div className="text-white/40">
                    <span className="text-white/70">Film Grain:</span>{" "}
                    Texture intensity
                  </div>
                  <div className="text-white/40">
                    <span className="text-white/70">Grain Speed:</span>{" "}
                    Animation speed
                  </div>
                  <div className="text-white/40">
                    <span className="text-white/70">Blend Mode:</span>{" "}
                    Normal, Multiply, Screen, Overlay, etc.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 3: Performance Tips
    {
      title: "Performance Tips",
      subtitle: "Mobile vs Desktop",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-white/70 font-medium mb-3 flex items-center gap-2">
                <span>💻</span>
                <span>Desktop / Laptop</span>
              </h4>
              <div className="space-y-2 text-sm text-white/40">
                <div>✓ All effects work smoothly</div>
                <div>✓ Crank everything to maximum</div>
                <div>✓ Combine heavy effects freely</div>
                <div>✓ Use high Ghost Frames (20-90)</div>
                <div>✓ Motion Analysis works great</div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 text-white/40 text-sm">
                Desktop can handle it all — experiment without
                limits!
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-white/70 font-medium mb-3 flex items-center gap-2">
                <span>📱</span>
                <span>Mobile / Tablet</span>
              </h4>
              <div className="space-y-2 text-sm text-white/40">
                <div>⚠ Keep effects moderate</div>
                <div>⚠ Film Grain under 30%</div>
                <div>⚠ Ghost Frames: 8-15 max</div>
                <div>⚠ Motion Analysis not available</div>
                <div>⚠ Expect battery drain & heat</div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 text-white/40 text-sm">
                Less is more on mobile — prioritize smoothness
                over maximum effects.
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="text-white/70 font-medium mb-3">
              What Slows Things Down
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-white/40">
                <span className="text-white/70">🔴 Heavy:</span>{" "}
                Motion Analysis, High Ghost Frames, Blob Tracking,
                Film Grain
              </div>
              <div className="text-white/40">
                <span className="text-white/70">🟡 Medium:</span>{" "}
                Ghost Trail effects, Kaleidoscope modes,
                Grid Background
              </div>
              <div className="text-white/40">
                <span className="text-white/70">🟢 Light:</span>{" "}
                Color Palette, Saturation, Brightness,
                Haziness, GLSL Shaders
              </div>
            </div>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-lg p-4">
            <h4 className="text-white/70 font-medium mb-2">
              Quick Fix for Lag
            </h4>
            <p className="text-white/40 text-sm">
              Reduce{" "}
              <span className="text-white/70">Ghost Frames</span>{" "}
              to 10, turn off{" "}
              <span className="text-white/70">Film Grain</span>,{" "}
              disable{" "}
              <span className="text-white/70">Blob Tracking</span>{" "}
              if not needed. This fixes most performance issues.
            </p>
          </div>
        </div>
      ),
    },

    // Slide 4: Tips & Tricks
    {
      title: "Tips & Tricks",
      subtitle: "Getting the Best Results",
      content: (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="text-white/70 font-medium mb-3">
              ✨ Great Combinations
            </h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li>
                •{" "}
                <span className="text-white/70">
                  Kaleidoscope + Motion Trails
                </span>{" "}
                = Mesmerizing mirrored effects
              </li>
              <li>
                •{" "}
                <span className="text-white/70">
                  Grid Background + GLSL Shaders
                </span>{" "}
                = Layered visual depth
              </li>
              <li>
                •{" "}
                <span className="text-white/70">
                  Motion Analysis + Ghost Trails
                </span>{" "}
                = Technical movement visualization (uploaded videos)
              </li>
              <li>
                •{" "}
                <span className="text-white/70">
                  Blob Tracking + Kaleidoscope
                </span>{" "}
                = Abstract motion patterns
              </li>
              <li>
                •{" "}
                <span className="text-white/70">
                  Low Film Grain (10-20%)
                </span>{" "}
                = Subtle texture without lag
              </li>
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="text-white/70 font-medium mb-3">
              💡 Creative Workflow
            </h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li>
                <span className="text-white/70">1.</span> Upload a video or enable webcam
              </li>
              <li>
                  <span className="text-white/70">2.</span> Tune Motion Trails and Motion Analysis effects first (turn them off if wanted)
                </li>
              <li>
                <span className="text-white/70">3.</span> Experiment with Kaleidoscope and Blob Tracking
              </li>
              <li>
                <span className="text-white/70">4.</span> Change the background visuals first (Grid, GLSL)
              </li>
              <li>
                <span className="text-white/70">5.</span> Add or remove grain in the post processing section and export!
              </li>
            </ul>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-lg p-4">
            <h4 className="text-white/70 font-medium mb-3">
              🎯 Troubleshooting
            </h4>
            <ul className="space-y-2 text-sm text-white/40">
              <li>
                •{" "}
                <span className="text-white/70">
                  Camera not working?
                </span>{" "}
                Check browser permissions, reload page
              </li>
              <li>
                •{" "}
                <span className="text-white/70">
                  Motion Analysis not showing?
                </span>{" "}
                Only works with uploaded videos, not webcam
              </li>
              <li>
                •{" "}
                <span className="text-white/70">
                  GLSL Background not visible?
                </span>{" "}
                Toggle off "Original Video Background" first
              </li>
              <li>
                •{" "}
                <span className="text-white/70">
                  Performance issues?
                </span>{" "}
                Lower Ghost Frames, disable heavy effects
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) =>
      prev < slides.length - 1 ? prev + 1 : prev,
    );
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  };

  // Reset to first slide when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentSlide]);

  // Safety check for slides array
  const currentSlideData = slides[currentSlide];
  if (!currentSlideData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        style={{
          maxWidth: "600px",
          maxHeight: "90vh",
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <div>
                <h2 className="pt-[0px] pr-[0px] pb-[0px] pl-[0px] text-white/70">
                  {currentSlideData.title}
                </h2>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-white/40">
            {currentSlideData.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div
          className="space-y-4"
          style={{
            marginTop: "0px",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          <Separator className="bg-white/10" />

          {/* Slide content */}
          <div className="text-white/70">
            {currentSlideData.content}
          </div>

          {/* Navigation footer */}
          <Separator className="bg-white/10" />
          <div className="flex items-center justify-between pt-2">
            <Button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              variant="outline"
              size="sm"
              className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 disabled:opacity-30"
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "bg-white/70 w-8"
                      : "bg-white/20 hover:bg-white/40 w-2"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <Button
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              variant="outline"
              size="sm"
              className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 disabled:opacity-30"
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}