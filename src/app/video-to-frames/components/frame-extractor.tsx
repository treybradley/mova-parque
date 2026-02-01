import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Input } from './ui/input';
import { Film, Loader2, Clock, Scissors } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ExtractedFrame } from '../VideoToFramesApp';

interface FrameExtractorProps {
  videoUrl: string;
  videoDuration: number;
  videoFPS: number;
  onFramesExtracted: (frames: ExtractedFrame[]) => void;
}

export function FrameExtractor({ videoUrl, videoDuration, videoFPS, onFramesExtracted }: FrameExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMethod, setExtractionMethod] = useState<'interval' | 'total' | 'range'>('interval');
  const [frameInterval, setFrameInterval] = useState(10);
  const [totalFrames, setTotalFrames] = useState(30);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(videoDuration);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
    }
  }, [videoUrl]);

  useEffect(() => {
    setEndTime(videoDuration);
  }, [videoDuration]);

  const extractFrames = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsExtracting(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setIsExtracting(false);
      return;
    }

    const frames: ExtractedFrame[] = [];
    let duration: number;
    let offset: number;

    if (extractionMethod === 'range') {
      duration = endTime - startTime;
      offset = startTime;
    } else {
      duration = videoDuration;
      offset = 0;
    }
    
    let frameCount: number;
    let timeInterval: number;

    if (extractionMethod === 'interval') {
      frameCount = Math.floor(duration * videoFPS / frameInterval);
      timeInterval = frameInterval / videoFPS;
    } else {
      frameCount = totalFrames;
      timeInterval = duration / (totalFrames - 1 || 1);
    }

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    for (let i = 0; i < frameCount; i++) {
      const time = offset + (i * timeInterval);
      
      // Seek to specific time
      await new Promise<void>((resolve) => {
        video.currentTime = time;
        video.onseeked = () => resolve();
      });

      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      frames.push({
        id: `frame-${i}`,
        dataUrl,
        timestamp: time,
        frameNumber: i + 1,
      });
    }

    onFramesExtracted(frames);
    setIsExtracting(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-4">
        <div>
          <Label className="mb-3 block text-white/70">Extraction Method</Label>
          <RadioGroup
            value={extractionMethod}
            onValueChange={(value) => setExtractionMethod(value as 'interval' | 'total' | 'range')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="interval" id="interval" />
              <Label htmlFor="interval" className="cursor-pointer text-white/70">
                Every N frames
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="total" id="total" />
              <Label htmlFor="total" className="cursor-pointer text-white/70">
                Total frame count
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="range" id="range" />
              <Label htmlFor="range" className="cursor-pointer text-white/70">
                Time range
              </Label>
            </div>
          </RadioGroup>
        </div>

        {extractionMethod === 'range' && (
          <div className="p-3 rounded-lg space-y-3 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Scissors className="size-4 text-white/70" />
              <Label className="text-white/70">Select Time Range</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startTime" className="mb-2 block text-xs text-white/60">Start Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-white/40" />
                  <Input
                    id="startTime"
                    type="number"
                    min={0}
                    max={endTime - 0.1}
                    step={0.1}
                    value={startTime.toFixed(1)}
                    onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="bg-white/5 border-white/10 text-white/70 placeholder:text-white/30"
                  />
                </div>
                <p className="text-xs mt-1 text-white/40">
                  {formatTime(startTime)}
                </p>
              </div>
              <div>
                <Label htmlFor="endTime" className="mb-2 block text-xs text-white/60">End Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-white/40" />
                  <Input
                    id="endTime"
                    type="number"
                    min={startTime + 0.1}
                    max={videoDuration}
                    step={0.1}
                    value={endTime.toFixed(1)}
                    onChange={(e) => setEndTime(Math.min(videoDuration, parseFloat(e.target.value) || videoDuration))}
                    className="bg-white/5 border-white/10 text-white/70 placeholder:text-white/30"
                  />
                </div>
                <p className="text-xs mt-1 text-white/40">
                  {formatTime(endTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-xs text-white/40">Duration:</span>
              <span className="text-xs text-white/70">{(endTime - startTime).toFixed(1)}s</span>
            </div>
          </div>
        )}

        {extractionMethod === 'interval' || extractionMethod === 'range' ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-white/70">Frame Interval</Label>
              <span className="text-xs text-white/40">
                Every {frameInterval} frames
              </span>
            </div>
            <Slider
              value={[frameInterval]}
              onValueChange={([value]) => setFrameInterval(value)}
              min={1}
              max={60}
              step={1}
              className="mb-2"
            />
            <p className="text-xs text-white/40">
              ≈ {Math.floor((extractionMethod === 'range' ? (endTime - startTime) : videoDuration) * videoFPS / frameInterval)} frames total
            </p>
          </div>
        ) : (
          <div>
            <Label htmlFor="totalFrames" className="mb-2 block text-white/70">
              Total Frames
            </Label>
            <Input
              id="totalFrames"
              type="number"
              min={1}
              max={1000}
              value={totalFrames}
              onChange={(e) => setTotalFrames(parseInt(e.target.value) || 1)}
              className="bg-white/5 border-white/10 text-white/70 placeholder:text-white/30"
            />
            <p className="text-xs mt-1 text-white/40">
              One frame every {(videoDuration / totalFrames).toFixed(2)}s
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/40">Duration</p>
            <p className="text-white/70">{videoDuration.toFixed(1)}s</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/40">FPS</p>
            <p className="text-white/70">{videoFPS}</p>
          </div>
        </div>

        <Button
          onClick={extractFrames}
          disabled={isExtracting}
          className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30"
        >
          {isExtracting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Extracting Frames...
            </>
          ) : (
            <>
              <Film className="size-4 mr-2" />
              Extract Frames
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
