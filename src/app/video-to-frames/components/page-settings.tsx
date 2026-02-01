import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { PageConfig } from '../VideoToFramesApp';

interface PageSettingsProps {
  config: PageConfig;
  onConfigChange: (config: PageConfig) => void;
  totalFrames: number;
}

const PAGE_PRESETS = {
  'A4': { width: 210, height: 297 },
  'A3': { width: 297, height: 420 },
  'Letter': { width: 216, height: 279 },
  'Legal': { width: 216, height: 356 },
  'Tabloid': { width: 279, height: 432 },
  'Custom': { width: 210, height: 297 },
};

export function PageSettings({ config, onConfigChange, totalFrames }: PageSettingsProps) {
  const handlePresetChange = (preset: string) => {
    const dimensions = PAGE_PRESETS[preset as keyof typeof PAGE_PRESETS];
    onConfigChange({
      ...config,
      preset,
      width: config.orientation === 'portrait' ? dimensions.width : dimensions.height,
      height: config.orientation === 'portrait' ? dimensions.height : dimensions.width,
    });
  };

  const handleOrientationChange = (orientation: 'portrait' | 'landscape') => {
    onConfigChange({
      ...config,
      orientation,
      width: config.height,
      height: config.width,
    });
  };

  const framesPerPage = config.gridRows * config.gridCols;
  const totalPages = Math.ceil(totalFrames / framesPerPage);

  return (
    <div className="space-y-4">
      {/* Page Size Preset */}
      <div>
        <Label htmlFor="preset" className="mb-2 block text-white/70">
          Page Size
        </Label>
        <Select value={config.preset} onValueChange={handlePresetChange}>
          <SelectTrigger id="preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(PAGE_PRESETS).map((preset) => (
              <SelectItem key={preset} value={preset}>
                {preset}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orientation */}
      <div>
        <Label htmlFor="orientation" className="mb-2 block text-white/70">
          Orientation
        </Label>
        <Select value={config.orientation} onValueChange={handleOrientationChange}>
          <SelectTrigger id="orientation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom Dimensions */}
      {config.preset === 'Custom' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="width" className="mb-2 block text-white/70">
              Width (mm)
            </Label>
            <Input
              id="width"
              type="number"
              value={config.width}
              onChange={(e) => onConfigChange({ ...config, width: parseInt(e.target.value) || 210 })}
              className="bg-white/5 border-white/10 text-white/70 placeholder:text-white/30"
            />
          </div>
          <div>
            <Label htmlFor="height" className="mb-2 block text-white/70">
              Height (mm)
            </Label>
            <Input
              id="height"
              type="number"
              value={config.height}
              onChange={(e) => onConfigChange({ ...config, height: parseInt(e.target.value) || 297 })}
              className="bg-white/5 border-white/10 text-white/70 placeholder:text-white/30"
            />
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="pt-2 border-t border-white/10">
        <Label className="mb-3 block text-white/70">Grid Layout</Label>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="rows" className="text-white/70">Rows</Label>
              <span className="text-xs text-white/40">{config.gridRows}</span>
            </div>
            <Slider
              id="rows"
              value={[config.gridRows]}
              onValueChange={([value]) => onConfigChange({ ...config, gridRows: value })}
              min={1}
              max={10}
              step={1}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="cols" className="text-white/70">Columns</Label>
              <span className="text-xs text-white/40">{config.gridCols}</span>
            </div>
            <Slider
              id="cols"
              value={[config.gridCols]}
              onValueChange={([value]) => onConfigChange({ ...config, gridCols: value })}
              min={1}
              max={10}
              step={1}
            />
          </div>
        </div>
      </div>

      {/* Spacing */}
      <div className="pt-2 border-t border-white/10">
        <Label className="mb-3 block text-white/70">Spacing</Label>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="margin" className="text-white/70">Page Margin (mm)</Label>
              <span className="text-xs text-white/40">{config.margin}</span>
            </div>
            <Slider
              id="margin"
              value={[config.margin]}
              onValueChange={([value]) => onConfigChange({ ...config, margin: value })}
              min={0}
              max={30}
              step={1}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="spacing" className="text-white/70">Frame Spacing (mm)</Label>
              <span className="text-xs text-white/40">{config.spacing}</span>
            </div>
            <Slider
              id="spacing"
              value={[config.spacing]}
              onValueChange={([value]) => onConfigChange({ ...config, spacing: value })}
              min={0}
              max={20}
              step={1}
            />
          </div>
        </div>
      </div>

      {/* Print Options */}
      <div className="pt-2 border-t border-white/10">
        <Label className="mb-3 block text-white/70">Print Options</Label>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label htmlFor="frameNumbers" className="text-white/70">Frame Numbers</Label>
              <span className="text-xs text-white/40">Show sequential numbers on frames</span>
            </div>
            <Switch
              id="frameNumbers"
              checked={config.showFrameNumbers}
              onCheckedChange={(checked) => onConfigChange({ ...config, showFrameNumbers: checked })}
            />
          </div>

          {config.showFrameNumbers && (
            <div className="ml-4">
              <Label htmlFor="numberPosition" className="mb-2 block text-xs text-white/60">Number Position</Label>
              <Select
                value={config.frameNumberPosition}
                onValueChange={(value: any) => onConfigChange({ ...config, frameNumberPosition: value })}
              >
                <SelectTrigger id="numberPosition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-center">Bottom Center</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label htmlFor="timecodes" className="text-white/70">Timecodes</Label>
              <span className="text-xs text-white/40">Display video timestamp</span>
            </div>
            <Switch
              id="timecodes"
              checked={config.showTimecodes}
              onCheckedChange={(checked) => onConfigChange({ ...config, showTimecodes: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label htmlFor="registration" className="text-white/70">Registration Marks</Label>
              <span className="text-xs text-white/40">Add corner alignment markers</span>
            </div>
            <Switch
              id="registration"
              checked={config.showRegistrationMarks}
              onCheckedChange={(checked) => onConfigChange({ ...config, showRegistrationMarks: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label htmlFor="cutGuides" className="text-white/70">Cut Guides</Label>
              <span className="text-xs text-white/40">Dashed lines for cutting</span>
            </div>
            <Switch
              id="cutGuides"
              checked={config.showCutGuides}
              onCheckedChange={(checked) => onConfigChange({ ...config, showCutGuides: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label htmlFor="bw" className="text-white/70">Black & White</Label>
              <span className="text-xs text-white/40">Convert to grayscale</span>
            </div>
            <Switch
              id="bw"
              checked={config.blackAndWhite}
              onCheckedChange={(checked) => onConfigChange({ ...config, blackAndWhite: checked })}
            />
          </div>

          {config.blackAndWhite && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="contrast" className="text-white/70">Contrast</Label>
                <span className="text-xs text-white/40">{config.contrast}%</span>
              </div>
              <Slider
                id="contrast"
                value={[config.contrast]}
                onValueChange={([value]) => onConfigChange({ ...config, contrast: value })}
                min={50}
                max={200}
                step={10}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}