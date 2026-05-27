import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UsageGuideModal } from "./UsageGuideModal";
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
    // Slide 1: Filming tips
    {
      title: "Filming Tips",
      subtitle: "Get better results from your video",
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-white/60">
            The best clips are designed for body segmentation + motion analysis.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <ul className="space-y-2 text-sm text-white/60">
              <li>Good lighting on the subject</li>
              <li>Camera stays still (tripod preferred)</li>
              <li>Only one subject at a time</li>
              <li>Subject is fully in frame</li>
              <li>Simple background / clear contrast</li>
              <li>Minimize occlusions (avoid blocking the subject)</li>
            </ul>
          </div>
        </div>
      ),
    },

    // Slide 2: Performance + troubleshooting
    {
      title: "Performance",
      subtitle: "Troubleshoot lag & missing effects",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-white/70 font-medium mb-3 flex items-center gap-2 text-sm">
                <span>Desktop is preferred, but if using Mobile / Tablet:</span>
              </h4>
              <div className="space-y-2 text-sm text-white/60">
                <div>⚠ Keep effects moderate for smooth playback</div>
                <div>⚠ Film Grain can be heavy (use less)</div>
                <div>⚠ Expect battery drain & heat</div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="text-white/70 font-medium mb-3 text-sm">
            Quick fixes + Troubleshooting
            </h4>
            <ul className="space-y-2 text-sm text-white/60">
            <li>
              If experiencing lag, reduce <span className="text-white/70">Ghost Frames</span>, turn off{" "}
              <span className="text-white/70">Film Grain</span>, and disable{" "}
              <span className="text-white/70">Blob Tracking</span>
              </li>
              <li>
                <span className="text-white/70">Camera issues?</span> Check browser permissions and reload.
              </li>
              <li>
                <span className="text-white/70">Motion Analysis</span> (skeleton, joint angles) works with uploaded videos only, not webcam. For more, try{" "}
                <a
                  href="https://mova-mvp-dev-01.vercel.app/open-move"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 underline underline-offset-2 hover:text-white"
                >
                  Mova Atlética (beta)
                </a>
                .
              </li>
            </ul>
          </div>
        </div>
      ),
    },

    // Slide 3: Understanding controls
    {
      title: "Understanding Controls",
      subtitle: "What each section changes",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-white/70 mb-3 text-sm">Body Trails</h4>
              <div className="space-y-2 text-xs">
                <div className="text-white/40">
                  <span className="text-white/70">Body Segmentation:</span> Enable/disable body tracking
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Show Ghost Trails:</span> Toggle the trail overlay
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Ghost Trail / Frames / Decay:</span> Trail look & persistence
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Live Person Visibility:</span> Current silhouette opacity
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Visibility (Fallback):</span> Base visibility when minimal effects
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-white/70 mb-3 text-sm">Motion Analysis</h4>
              <div className="space-y-2 text-xs">
                <div className="text-white/40">
                  <span className="text-white/70">Enable Motion Analysis:</span> Turn pose tracking on/off
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Show Skeleton:</span> Pose estimation overlay
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Show Joint Angles:</span> Angle labels on the skeleton
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Show ROM:</span> Range of motion tracking
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-white/70 mb-3 text-sm">More Visual Processing</h4>
              <div className="space-y-2 text-xs">
                <div className="text-white/40">
                  <span className="text-white/70">Kaleidoscope:</span> Mirror effects
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Depth Anything:</span> Depth-based visuals
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Blob Tracking:</span> Motion detection with connections
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-white/70 mb-3 text-sm">Post Processing</h4>
              <div className="space-y-2 text-xs">
                <div className="text-white/40">
                  <span className="text-white/70">Film Grain:</span> Texture intensity
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Grain Speed:</span> Animation speed
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Blend Mode:</span> How noise blends with the scene
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-white/70 mb-3 text-sm">Record &amp; Export</h4>
              <div className="space-y-2 text-xs">
                <div className="text-white/40">
                  <span className="text-white/70">Frame rate:</span> Export FPS
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Quality:</span> Standard / High / Max
                </div>
                <div className="text-white/40">
                  <span className="text-white/70">Record / Stop:</span> Start and end your capture
                </div>
              </div>
            </div>
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

  const slideFooter = (
    <div className="flex items-center justify-between w-full">
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
  );

  return (
    <UsageGuideModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={currentSlideData.title}
      description={currentSlideData.subtitle}
      footer={slideFooter}
    >
      <Separator className="bg-white/10" />
      <div className="text-white/70">{currentSlideData.content}</div>
    </UsageGuideModal>
  );
}