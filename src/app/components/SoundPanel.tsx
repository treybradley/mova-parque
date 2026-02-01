import { motion } from "motion/react";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { CollapsibleSection } from "./ui/collapsible-section";
import { ChevronLeft, ChevronRight, AudioWaveform } from "lucide-react";
import { useState } from "react";
import { ResponsiveInfoPopover } from "./ui/responsive-info-popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

interface SoundPanelProps {
  soundDesign: {
    enabled: boolean;
    masterVolume: number;
    sonicPreset: number;
    layers: {
      drone: number;
      atmosphere: number;
      shimmer: number;
      pulse: number;
      reactive: number;
    };
    harmonic: {
      complexity: number;
      progressionSpeed: number;
      brightness: number;
      richness: number;
    };
    reactivity: {
      motionSensitivity: number;
      velocityInfluence: number;
      proximityEffect: number;
    };
    effects: {
      reverb: number;
      delay: number;
      filter: number;
    };
  };
  onSoundDesignChange: (key: string, value: number | boolean) => void;
  onLayerChange: (key: string, value: number) => void;
  onHarmonicChange: (key: string, value: number) => void;
  onReactivityChange: (key: string, value: number) => void;
  onEffectsChange: (key: string, value: number) => void;
  onPresetChange: (preset: number) => void;
}

const sonicMoodNames = [
  "Stasis",
  "Tension",
  "Flow",
  "Drive",
  "Kinetic",
];

export function SoundPanel(props: SoundPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Tooltip content for Sound Layers
  const soundLayersTooltip = (
    <div className="space-y-2 text-white">
      <p className="font-semibold text-white text-xs mb-2">Sound Layers:</p>
      <div className="space-y-1.5 text-[10px] leading-relaxed">
        <p><strong>Drone:</strong> Deep bass foundation providing harmonic grounding</p>
        <p><strong>Atmosphere:</strong> Evolving chord pads creating ambient texture</p>
        <p><strong>Shimmer:</strong> High-frequency sparkles adding brightness and air</p>
        <p><strong>Pulse:</strong> Rhythmic element providing temporal structure</p>
        <p><strong>Reactive:</strong> Motion-driven melodic layer responding to body movement</p>
      </div>
    </div>
  );

  // Tooltip content for Harmonic Character
  const harmonicCharacterTooltip = (
    <div className="space-y-2 text-white">
      <p className="font-semibold text-white text-xs mb-2">Harmonic Character:</p>
      <div className="space-y-1.5 text-[10px] leading-relaxed">
        <p><strong>Complexity:</strong> Density of harmonic content (sparse to rich chords)</p>
        <p><strong>Progression:</strong> Speed of chord changes and harmonic evolution</p>
        <p><strong>Brightness:</strong> Filter cutoff frequency for tonal character</p>
        <p><strong>Richness:</strong> Overtone and harmonic content for timbral depth</p>
      </div>
    </div>
  );

  // Tooltip content for Motion Reactivity
  const motionReactivityTooltip = (
    <div className="space-y-2 text-white">
      <p className="font-semibold text-white text-xs mb-2">Motion Reactivity:</p>
      <div className="space-y-1.5 text-[10px] leading-relaxed">
        <p><strong>Sensitivity:</strong> How responsive sound is to body movement intensity</p>
        <p><strong>Velocity:</strong> Influence of movement speed on filter and layer volumes</p>
        <p><strong>Proximity:</strong> Effect of body position on pitch and spatial parameters</p>
      </div>
    </div>
  );

  // Tooltip content for Sound Atmosphere
  const soundAtmosphereTooltip = (
    <div className="space-y-2 text-white">
      <p className="font-semibold text-white text-xs mb-2">Atmosphere:</p>
      <div className="space-y-1.5 text-[10px] leading-relaxed">
        <p><strong>Reverb:</strong> Spatial depth and room size simulation</p>
        <p><strong>Delay:</strong> Echo feedback creating temporal depth</p>
        <p><strong>Filter:</strong> Frequency range and spectral character</p>
      </div>
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: isOpen ? 0 : 400, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="fixed right-0 top-0 h-full w-[320px] md:w-[400px] bg-black/40 backdrop-blur-xl border-l border-white/10 overflow-y-auto control-panel-scroll z-50"
      >
        <div className="p-4 md:p-8 space-y-5">
          {/* Header with toggle button */}
          <div className="space-y-2 relative">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-light tracking-wider text-white/60 uppercase">
                  Soundscape
                </h1>
                <p className="text-xs text-white/40 leading-relaxed mt-2">
                  Generative audio that reacts to motion and visual state.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all flex-shrink-0"
                title="Close panel"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Master Controls */}
          <div className="space-y-4">
            <Label className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px] underline">
              Master Controls
            </Label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Audio Enabled
                </span>
                <Switch
                  checked={props.soundDesign.enabled}
                  onCheckedChange={(value) =>
                    props.onSoundDesignChange("enabled", value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Master Volume
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.masterVolume * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.masterVolume]}
                onValueChange={(value) =>
                  props.onSoundDesignChange("masterVolume", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>
          </div>

          {/* Sonic Mood Presets */}
          <div className="space-y-4">
            <Label className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px] underline">
              Sonic Palette
            </Label>

            <div className="grid grid-cols-3 gap-2">
              {sonicMoodNames.map((name, index) => {
                const button = (
                  <button
                    key={index}
                    onClick={() => props.onPresetChange(index)}
                    disabled={!props.soundDesign.enabled}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all h-10 group ${
                      props.soundDesign.sonicPreset === index
                        ? "border-white/50 shadow-lg shadow-white/20 bg-white/10"
                        : "border-white/10 hover:border-white/30 bg-white/5"
                    } ${
                      !props.soundDesign.enabled
                        ? "opacity-40 cursor-not-allowed hover:border-white/10"
                        : ""
                    }`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[11px] font-light text-white px-2 py-0.5 rounded-md">
                        {name}
                      </span>
                    </div>
                  </button>
                );

                // Wrap disabled buttons with tooltip
                if (!props.soundDesign.enabled) {
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        {button}
                      </TooltipTrigger>
                      <TooltipContent 
                        side="bottom" 
                        className="bg-white/90 text-black border-white/20 [&>*:last-child]:hidden"
                      >
                        <p className="text-xs">Enable audio to experience Sonic Oura</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return button;
              })}
            </div>
          </div>

          {/* Sound Layers */}
          <CollapsibleSection title="Sound Layers" defaultOpen={false}>
            <div className="pb-4 border-b border-white/10 space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Control the volume of each generative sound layer.
              </p>
              <ResponsiveInfoPopover content={soundLayersTooltip} side="right" />
            </div>

            {/* Drone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Drone
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.layers.drone * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.layers.drone]}
                onValueChange={(value) =>
                  props.onLayerChange("drone", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Atmosphere */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Atmosphere
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.layers.atmosphere * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.layers.atmosphere]}
                onValueChange={(value) =>
                  props.onLayerChange("atmosphere", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Shimmer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Shimmer
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.layers.shimmer * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.layers.shimmer]}
                onValueChange={(value) =>
                  props.onLayerChange("shimmer", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Pulse */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Pulse
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.layers.pulse * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.layers.pulse]}
                onValueChange={(value) =>
                  props.onLayerChange("pulse", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Reactive */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Reactive
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.layers.reactive * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.layers.reactive]}
                onValueChange={(value) =>
                  props.onLayerChange("reactive", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>
          </CollapsibleSection>

          {/* Harmonic Character */}
          <CollapsibleSection
            title="Harmonic Character"
            defaultOpen={false}
          >
            <div className="pb-4 border-b border-white/10 space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Adjust the musical complexity and tonal characteristics.
              </p>
              <ResponsiveInfoPopover content={harmonicCharacterTooltip} side="right" />
            </div>

            {/* Complexity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Complexity
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.harmonic.complexity * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.harmonic.complexity]}
                onValueChange={(value) =>
                  props.onHarmonicChange("complexity", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Progression Speed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Progression
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.harmonic.progressionSpeed * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.harmonic.progressionSpeed]}
                onValueChange={(value) =>
                  props.onHarmonicChange("progressionSpeed", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Brightness
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.harmonic.brightness * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.harmonic.brightness]}
                onValueChange={(value) =>
                  props.onHarmonicChange("brightness", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Richness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Richness
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.harmonic.richness * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.harmonic.richness]}
                onValueChange={(value) =>
                  props.onHarmonicChange("richness", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>
          </CollapsibleSection>

          {/* Motion Reactivity */}
          <CollapsibleSection title="Motion Reactivity" defaultOpen={false}>
            <div className="pb-4 border-b border-white/10 space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Control how body movement affects sound parameters.
              </p>
              <ResponsiveInfoPopover content={motionReactivityTooltip} side="right" />
            </div>

            {/* Sensitivity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Sensitivity
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.reactivity.motionSensitivity * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.reactivity.motionSensitivity]}
                onValueChange={(value) =>
                  props.onReactivityChange("motionSensitivity", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Velocity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Velocity
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.reactivity.velocityInfluence * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.reactivity.velocityInfluence]}
                onValueChange={(value) =>
                  props.onReactivityChange("velocityInfluence", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Proximity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Proximity
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.reactivity.proximityEffect * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.reactivity.proximityEffect]}
                onValueChange={(value) =>
                  props.onReactivityChange("proximityEffect", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>
          </CollapsibleSection>

          {/* Sound Atmosphere */}
          <CollapsibleSection title="Atmosphere" defaultOpen={false}>
            <div className="pb-4 border-b border-white/10 space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Adjust reverb, delay, and filter effects.
              </p>
              <ResponsiveInfoPopover content={soundAtmosphereTooltip} side="right" />
            </div>

            {/* Reverb */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Reverb
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.effects.reverb * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.effects.reverb]}
                onValueChange={(value) =>
                  props.onEffectsChange("reverb", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Delay */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Delay
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.effects.delay * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.effects.delay]}
                onValueChange={(value) =>
                  props.onEffectsChange("delay", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>

            {/* Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-light">
                  Filter
                </span>
                <span className="text-xs text-white/50 font-light">
                  {Math.round(props.soundDesign.effects.filter * 100)}
                </span>
              </div>
              <Slider
                value={[props.soundDesign.effects.filter]}
                onValueChange={(value) =>
                  props.onEffectsChange("filter", value[0])
                }
                min={0}
                max={1}
                step={0.01}
                className="slider-custom"
              />
            </div>
          </CollapsibleSection>
        </div>
      </motion.div>

      {/* Toggle Button - Only visible when panel is closed */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/70 p-3 rounded-l-xl transition-colors z-50"
        >
          <AudioWaveform size={20} />
        </motion.button>
      )}
    </>
  );
}