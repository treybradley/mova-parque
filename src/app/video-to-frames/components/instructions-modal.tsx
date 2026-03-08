import { UsageGuideModal } from "@/app/components/UsageGuideModal";
import { Separator } from "./ui/separator";
import { Film, Upload, Grid3x3, Printer } from "lucide-react";
import exampleImage from "@/assets/4f32671165e20b1604f79cd1ce55456b3ff6f14a.png";

interface InstructionsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstructionsModal({
  isOpen,
  onOpenChange,
}: InstructionsModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) localStorage.setItem("hasSeenInstructions", "true");
    onOpenChange(open);
  };

  return (
    <UsageGuideModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Video to Frames Usage Guide"
      description="Steps to convert your video into printable frame sequences."
    >
      <div className="w-full h-40 bg-white/10 rounded-md flex flex-col items-center justify-center overflow-hidden">
        <img
          src={exampleImage}
          alt="Example of frame grid layout showing movement sequences"
          className="w-full h-full object-cover"
        />
      </div>
      <Separator className="bg-white/10" />

      <div className="space-y-3">
        <h3 className="text-white/80 text-sm">Quick Start Guide</h3>

        <div className="flex gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-[21px] h-[21px] rounded-full bg-white/20 text-white/80">
            <Upload className="size-3" />
          </div>
          <div>
            <h4 className="text-white/80 text-sm">1. Upload Your Video</h4>
            <p className="text-white/60 text-sm">
              Drag and drop any video file or click to browse. Supports MP4, MOV, WebM and more.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center justify-center flex-shrink-0 w-[21px] h-[21px] rounded-full bg-white/20 text-white/80">
            <Film className="size-3" />
          </div>
          <div>
            <h4 className="text-white/80 text-sm">2. Extract Frames</h4>
            <p className="text-white/60 text-sm">
              Choose to extract every Nth frame or specify total frames. Perfect for stop-motion workflows.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center justify-center flex-shrink-0 w-[21px] h-[21px] rounded-full bg-white/20 text-white/80">
            <Grid3x3 className="size-3" />
          </div>
          <div>
            <h4 className="text-white/80 text-sm">3. Configure Layout</h4>
            <p className="text-white/60 text-sm">
              Customize paper size, grid layout, margins, frame numbers, and more advanced options.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center justify-center flex-shrink-0 w-[21px] h-[21px] rounded-full bg-white/20 text-white/80">
            <Printer className="size-3" />
          </div>
          <div>
            <h4 className="text-white/80 text-sm">4. Print or Export</h4>
            <p className="text-white/60 text-sm">
              Export as PNG pages or PDF. Print at 100% scale for accurate frame sizing.
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />
    </UsageGuideModal>
  );
}