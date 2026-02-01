import { TrackingSettings, VisualSettings, SoundSettings, TrackingMode, BoxType, LineStyle, CentroidType, SynthType, ScaleType } from '@/app/mova-score/types';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { CollapsibleSection } from './ui/collapsible-section';

interface ControlPanelProps {
  trackingSettings: TrackingSettings;
  visualSettings: VisualSettings;
  soundSettings: SoundSettings;
  onTrackingSettingsChange: (settings: TrackingSettings) => void;
  onVisualSettingsChange: (settings: VisualSettings) => void;
  onSoundSettingsChange: (settings: SoundSettings) => void;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function ControlPanel({
  trackingSettings,
  visualSettings,
  soundSettings,
  onTrackingSettingsChange,
  onVisualSettingsChange,
  onSoundSettingsChange
}: ControlPanelProps) {
  
  const updateTracking = (partial: Partial<TrackingSettings>) => {
    onTrackingSettingsChange({ ...trackingSettings, ...partial });
  };

  const updateVisual = (partial: Partial<VisualSettings>) => {
    onVisualSettingsChange({ ...visualSettings, ...partial });
  };

  const updateSound = (partial: Partial<SoundSettings>) => {
    onSoundSettingsChange({ ...soundSettings, ...partial });
  };

  const getMidiNoteName = (midiNote: number) => {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = NOTE_NAMES[midiNote % 12];
    return `${noteName}${octave}`;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        
        {/* Tracking Settings */}
        <CollapsibleSection title="Tracking" defaultOpen={false}>
              
              {/* Tracking Mode */}
              <div className="space-y-2">
                <Label className="text-xs font-normal text-white/60">Detection Mode</Label>
                <Select
                  value={trackingSettings.mode}
                  onValueChange={(value) => updateTracking({ mode: value as TrackingMode })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10">
                    <SelectItem value="color">Color</SelectItem>
                    <SelectItem value="luminance">Luminance (Light/Dark)</SelectItem>
                    <SelectItem value="edge">Edge Detection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Color (only for color mode) */}
              {trackingSettings.mode === 'color' && (
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-white/60">Target Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={trackingSettings.targetColor || '#ff0000'}
                      onChange={(e) => updateTracking({ targetColor: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <span className="text-sm text-white/40">
                      {trackingSettings.targetColor || '#ff0000'}
                    </span>
                  </div>
                </div>
              )}

              {/* Tolerance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-normal text-white/60">Tolerance: {trackingSettings.tolerance.toFixed(2)}</Label>
                  {trackingSettings.tolerance > 0.3 && (
                    <span className={`text-xs ${trackingSettings.tolerance > 0.5 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {trackingSettings.tolerance > 0.5 ? 'High performance impact' : 'May reduce performance'}
                    </span>
                  )}
                </div>
                <Slider
                  value={[trackingSettings.tolerance]}
                  onValueChange={([value]) => updateTracking({ tolerance: value })}
                  min={0}
                  max={0.8}
                  step={0.01}
                />
                <p className="text-xs text-white/40">Higher values detect more but may exceed 30 blob limit</p>
              </div>

              {/* Min Blob Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-normal text-white/60">Min Blob Size: {trackingSettings.minBlobSize}</Label>
                  {trackingSettings.minBlobSize < 100 && (
                    <span className="text-xs text-yellow-400">May produce many blobs</span>
                  )}
                </div>
                <Slider
                  value={[trackingSettings.minBlobSize]}
                  onValueChange={([value]) => updateTracking({ minBlobSize: value })}
                  min={10}
                  max={1000}
                  step={10}
                />
                <p className="text-xs text-white/40">Lower values = more blobs (max 30 total)</p>
              </div>

              {/* Max Blob Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-normal text-white/60">Max Blob Size: {trackingSettings.maxBlobSize}</Label>
                  {trackingSettings.maxBlobSize > 20000 && (
                    <span className="text-xs text-yellow-400">Large blobs may impact performance</span>
                  )}
                </div>
                <Slider
                  value={[trackingSettings.maxBlobSize]}
                  onValueChange={([value]) => updateTracking({ maxBlobSize: value })}
                  min={1000}
                  max={50000}
                  step={100}
                />
                <p className="text-xs text-white/40">Higher values = larger blobs (max 30 total)</p>
              </div>

              {/* Visual Overlays */}
              <CollapsibleSection title="Visual Overlays" defaultOpen={false}>
                <div className="space-y-4">
                  
                  {/* Boxes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal text-white/60">Boxes</Label>
                      <Switch
                        checked={visualSettings.showBoxes}
                        onCheckedChange={(checked) => updateVisual({ showBoxes: checked })}
                      />
                    </div>
                    {visualSettings.showBoxes && (
                      <div className="space-y-3 pl-4 border-l border-white/10">
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Box Type</Label>
                      <Select
                        value={visualSettings.boxType}
                        onValueChange={(value) => updateVisual({ boxType: value as BoxType })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white/70">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10">
                          <SelectItem value="rectangle">Rectangle</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="l-frame">L-Frame</SelectItem>
                          <SelectItem value="x-frame">X-Frame</SelectItem>
                          <SelectItem value="scope">Scope</SelectItem>
                          <SelectItem value="corners">Corners</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Color</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={visualSettings.boxColor}
                          onChange={(e) => updateVisual({ boxColor: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <span className="text-sm text-white/40">{visualSettings.boxColor}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Weight: {visualSettings.boxWeight}px</Label>
                      <Slider
                        value={[visualSettings.boxWeight]}
                        onValueChange={([value]) => updateVisual({ boxWeight: value })}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Opacity: {Math.round(visualSettings.boxOpacity * 100)}%</Label>
                      <Slider
                        value={[visualSettings.boxOpacity]}
                        onValueChange={([value]) => updateVisual({ boxOpacity: value })}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>

                      </div>
                    )}
                  </div>

                  {/* Connections */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal text-white/60">Connections</Label>
                      <Switch
                        checked={visualSettings.showConnections}
                        onCheckedChange={(checked) => updateVisual({ showConnections: checked })}
                      />
                    </div>
                    {visualSettings.showConnections && (
                      <div className="space-y-3 pl-4 border-l border-white/10">
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Line Style</Label>
                      <Select
                        value={visualSettings.connectionLineStyle}
                        onValueChange={(value) => updateVisual({ connectionLineStyle: value as LineStyle })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white/70">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10">
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="dashed">Dashed</SelectItem>
                          <SelectItem value="dotted">Dotted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Color</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={visualSettings.connectionColor}
                          onChange={(e) => updateVisual({ connectionColor: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <span className="text-sm text-white/40">{visualSettings.connectionColor}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Weight: {visualSettings.connectionWeight}px</Label>
                      <Slider
                        value={[visualSettings.connectionWeight]}
                        onValueChange={([value]) => updateVisual({ connectionWeight: value })}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Opacity: {Math.round(visualSettings.connectionOpacity * 100)}%</Label>
                      <Slider
                        value={[visualSettings.connectionOpacity]}
                        onValueChange={([value]) => updateVisual({ connectionOpacity: value })}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>

                      </div>
                    )}
                  </div>

                  {/* Centroids */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal text-white/60">Centroids</Label>
                      <Switch
                        checked={visualSettings.showCentroids}
                        onCheckedChange={(checked) => updateVisual({ showCentroids: checked })}
                      />
                    </div>
                    {visualSettings.showCentroids && (
                      <div className="space-y-3 pl-4 border-l border-white/10">
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Centroid Type</Label>
                      <Select
                        value={visualSettings.centroidType}
                        onValueChange={(value) => updateVisual({ centroidType: value as CentroidType })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white/70">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10">
                          <SelectItem value="dot">Dot</SelectItem>
                          <SelectItem value="cross">Cross</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Color</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={visualSettings.centroidColor}
                          onChange={(e) => updateVisual({ centroidColor: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <span className="text-sm text-white/40">{visualSettings.centroidColor}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Size: {visualSettings.centroidSize}px</Label>
                      <Slider
                        value={[visualSettings.centroidSize]}
                        onValueChange={([value]) => updateVisual({ centroidSize: value })}
                        min={2}
                        max={20}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Opacity: {Math.round(visualSettings.centroidOpacity * 100)}%</Label>
                      <Slider
                        value={[visualSettings.centroidOpacity]}
                        onValueChange={([value]) => updateVisual({ centroidOpacity: value })}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>

                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleSection>

        </CollapsibleSection>

        {/* Sound Settings */}
        <CollapsibleSection title="Sound" defaultOpen={false}>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-xs font-normal text-white/60">Enable Sound</Label>
            <Switch
              checked={soundSettings.enabled}
              onCheckedChange={(checked) => updateSound({ enabled: checked })}
            />
          </div>
          {soundSettings.enabled && (
            <div className="space-y-4">
              
              {/* Master Controls */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-white/60">Synth Type</Label>
                  <Select
                    value={soundSettings.synthType}
                    onValueChange={(value) => updateSound({ synthType: value as SynthType })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10">
                      <SelectItem value="sine">Sine</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="sawtooth">Sawtooth</SelectItem>
                      <SelectItem value="triangle">Triangle</SelectItem>
                      <SelectItem value="fmsine">FM Sine</SelectItem>
                      <SelectItem value="amsine">AM Sine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-normal text-white/60">Master Volume: {Math.round(soundSettings.masterVolume * 100)}%</Label>
                  <Slider
                    value={[soundSettings.masterVolume]}
                    onValueChange={([value]) => updateSound({ masterVolume: value })}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-normal text-white/60">Attack: {soundSettings.attack.toFixed(2)}s</Label>
                  <Slider
                    value={[soundSettings.attack]}
                    onValueChange={([value]) => updateSound({ attack: value })}
                    min={0.001}
                    max={1}
                    step={0.01}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-normal text-white/60">Decay: {soundSettings.decay.toFixed(2)}s</Label>
                  <Slider
                    value={[soundSettings.decay]}
                    onValueChange={([value]) => updateSound({ decay: value })}
                    min={0.001}
                    max={2}
                    step={0.01}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-normal text-white/60">Sustain: {soundSettings.sustain.toFixed(2)}</Label>
                  <Slider
                    value={[soundSettings.sustain]}
                    onValueChange={([value]) => updateSound({ sustain: value })}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-normal text-white/60">Release: {soundSettings.release.toFixed(2)}s</Label>
                  <Slider
                    value={[soundSettings.release]}
                    onValueChange={([value]) => updateSound({ release: value })}
                    min={0.01}
                    max={2}
                    step={0.01}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-normal text-white/60">Max Voices: {soundSettings.maxVoices}</Label>
                  <Slider
                    value={[soundSettings.maxVoices]}
                    onValueChange={([value]) => updateSound({ maxVoices: Math.round(value) })}
                    min={1}
                    max={16}
                    step={1}
                  />
                  <p className="text-xs text-white/40">
                    Limits simultaneous sounds to prevent clipping
                  </p>
                </div>
              </div>

              {/* Mappings */}
              <CollapsibleSection title="Mappings" defaultOpen={false}>
                <div className="space-y-4">
                  
                  {/* Pitch Mapping */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal text-white/60">Y Position → MIDI Pitch</Label>
                      <Switch
                        checked={soundSettings.pitchEnabled}
                        onCheckedChange={(checked) => updateSound({ pitchEnabled: checked })}
                      />
                    </div>
                    {soundSettings.pitchEnabled && (
                      <div className="space-y-3 pl-4 border-l border-white/10">
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Scale</Label>
                      <Select
                        value={soundSettings.scale}
                        onValueChange={(value) => updateSound({ scale: value as ScaleType })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white/70 font-normal text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10">
                          <SelectItem value="chromatic">Chromatic (All Notes)</SelectItem>
                          <SelectItem value="major">Major</SelectItem>
                          <SelectItem value="minor">Minor</SelectItem>
                          <SelectItem value="pentatonic-major">Pentatonic Major</SelectItem>
                          <SelectItem value="pentatonic-minor">Pentatonic Minor</SelectItem>
                          <SelectItem value="blues">Blues</SelectItem>
                          <SelectItem value="dorian">Dorian</SelectItem>
                          <SelectItem value="phrygian">Phrygian</SelectItem>
                          <SelectItem value="lydian">Lydian</SelectItem>
                          <SelectItem value="mixolydian">Mixolydian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Root Note</Label>
                      <Select
                        value={soundSettings.rootNote.toString()}
                        onValueChange={(value) => updateSound({ rootNote: parseInt(value) })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white/70 font-normal text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10 font-normal text-xs">
                          {NOTE_NAMES.map((name, index) => (
                            <SelectItem key={index} value={index.toString()}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Range: {getMidiNoteName(soundSettings.pitchMin)} - {getMidiNoteName(soundSettings.pitchMax)}</Label>
                      <div className="space-y-1">
                        <Slider
                          value={[soundSettings.pitchMin, soundSettings.pitchMax]}
                          onValueChange={([min, max]) => updateSound({ pitchMin: min, pitchMax: max })}
                          min={24}
                          max={96}
                          step={1}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal text-white/60">Invert Y-axis</Label>
                      <Switch
                        checked={soundSettings.pitchInverted}
                        onCheckedChange={(checked) => updateSound({ pitchInverted: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal text-white/60">Quantize to Scale</Label>
                      <Switch
                        checked={soundSettings.quantizeToScale}
                        onCheckedChange={(checked) => updateSound({ quantizeToScale: checked })}
                      />
                    </div>

                      </div>
                    )}
                  </div>

                  {/* Pan Mapping */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal text-white/60">X Position → MIDI Pan</Label>
                      <Switch
                        checked={soundSettings.panEnabled}
                        onCheckedChange={(checked) => updateSound({ panEnabled: checked })}
                      />
                    </div>
                    {soundSettings.panEnabled && (
                      <div className="pl-4 border-l border-white/10">
                        <p className="text-xs text-white/40">
                          X position controls stereo panning (left to right)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Size/Velocity Mapping */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal text-white/60">Size → MIDI Velocity</Label>
                      <Switch
                        checked={soundSettings.sizeToVelocity}
                        onCheckedChange={(checked) => updateSound({ sizeToVelocity: checked })}
                      />
                    </div>
                    {soundSettings.sizeToVelocity && (
                      <div className="space-y-3 pl-4 border-l border-white/10">
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-normal text-white/60">Velocity Range: {soundSettings.velocityMin.toFixed(2)} - {soundSettings.velocityMax.toFixed(2)}</Label>
                      <Slider
                        value={[soundSettings.velocityMin, soundSettings.velocityMax]}
                        onValueChange={([min, max]) => updateSound({ velocityMin: min, velocityMax: max })}
                        min={0}
                        max={1}
                        step={0.01}
                      />
                    </div>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}
        </CollapsibleSection>

      </div>
    </ScrollArea>
  );
}
