import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
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
  // Removed auto-open effect - modal is now controlled manually
  
  const handleClose = () => {
    localStorage.setItem("hasSeenInstructions", "true");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          maxWidth: "600px",
          maxHeight: "90vh",
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Video Placeholder */}
        <div
          style={{
            width: "100%",
            height: "160px",
            backgroundColor: "var(--muted)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src={exampleImage}
            alt="Example of frame grid layout showing movement sequences"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <div>
                <h2 className="pt-[0px] pr-[0px] pb-[0px] pl-[0px]">
                  Video to Frames Usage Guide
                </h2>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Follow these steps to convert your video into
            printable frame sequences.
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
          <Separator />

          {/* Instructions Steps */}
          <div className="space-y-3">
            <h3>Quick Start Guide</h3>

            <div className="flex gap-3">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: "21px",
                  height: "21px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
              >
                <Upload className="size-3" />
              </div>
              <div>
                <h4>1. Upload Your Video</h4>
                <p style={{ color: "var(--muted-foreground)" }}>
                  Drag and drop any video file or click to
                  browse. Supports MP4, MOV, WebM and more.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: "21px",
                  height: "21px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
              >
                <Film className="size-3" />
              </div>
              <div>
                <h4>2. Extract Frames</h4>
                <p style={{ color: "var(--muted-foreground)" }}>
                  Choose to extract every Nth frame or specify
                  total frames. Perfect for stop-motion
                  workflows.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: "21px",
                  height: "21px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
              >
                <Grid3x3 className="size-3" />
              </div>
              <div>
                <h4>3. Configure Layout</h4>
                <p style={{ color: "var(--muted-foreground)" }}>
                  Customize paper size, grid layout, margins,
                  frame numbers, and more advanced options.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: "21px",
                  height: "21px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
              >
                <Printer className="size-3" />
              </div>
              <div>
                <h4>4. Print or Export</h4>
                <p style={{ color: "var(--muted-foreground)" }}>
                  Export as PNG pages or PDF. Print at 100%
                  scale for accurate frame sizing.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tips */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <h4 className="mb-2">Tips</h4>
            <ul className="space-y-1 small">
              <li>
                • Use registration marks for precise alignment
                across multiple prints
              </li>
              <li>
                • Convert to black & white for
                photocopier-friendly prints
              </li>
              <li>
                • Save your favorite configurations as presets
                for reuse
              </li>
            </ul>
          </div>

          {/* Close Button */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleClose}
              variant="default"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Get Started
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}