import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Save, Trash2, Download, Upload } from 'lucide-react';
import { PageConfig } from '../VideoToFramesApp';

interface PresetManagerProps {
  config: PageConfig;
  onLoadPreset: (config: PageConfig) => void;
}

interface SavedPreset {
  id: string;
  name: string;
  config: PageConfig;
  createdAt: string;
}

export function PresetManager({ config, onLoadPreset }: PresetManagerProps) {
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  useEffect(() => {
    loadPresetsFromStorage();
  }, []);

  const loadPresetsFromStorage = () => {
    try {
      const stored = localStorage.getItem('framePresets');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPresets(parsed);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const savePresetsToStorage = (updatedPresets: SavedPreset[]) => {
    try {
      localStorage.setItem('framePresets', JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
    } catch (error) {
      console.error('Failed to save presets:', error);
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      config: { ...config },
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    savePresetsToStorage(updatedPresets);
    setPresetName('');
    setSelectedPresetId(newPreset.id);
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      onLoadPreset(preset.config);
      setSelectedPresetId(presetId);
    }
  };

  const handleDeletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    savePresetsToStorage(updatedPresets);
    if (selectedPresetId === presetId) {
      setSelectedPresetId('');
    }
  };

  const handleExportPresets = () => {
    const dataStr = JSON.stringify(presets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'frame-presets.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPresets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          const updatedPresets = [...presets, ...imported];
          savePresetsToStorage(updatedPresets);
        }
      } catch (error) {
        console.error('Failed to import presets:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Save New Preset */}
      <div>
        <Label htmlFor="presetName" className="mb-2 block text-white/70">
          Save Current Settings
        </Label>
        <div className="flex gap-2">
          <Input
            id="presetName"
            placeholder="Enter preset name..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
            className="bg-white/5 border-white/10 text-white/70 placeholder:text-white/30"
          />
          <Button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            size="sm"
            className="bg-white/20 text-white border-white/30 hover:bg-white/30"
          >
            <Save className="size-4" />
          </Button>
        </div>
      </div>

      {/* Load Preset */}
      {presets.length > 0 && (
        <div>
          <Label htmlFor="loadPreset" className="mb-2 block text-white/70">
            Load Preset
          </Label>
          <div className="flex gap-2">
            <Select value={selectedPresetId} onValueChange={handleLoadPreset}>
              <SelectTrigger id="loadPreset">
                <SelectValue placeholder="Select a preset..." />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPresetId && (
              <Button
                onClick={() => handleDeletePreset(selectedPresetId)}
                variant="outline"
                size="sm"
                className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Import/Export */}
      {presets.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <div className="flex gap-2">
            <Button
              onClick={handleExportPresets}
              variant="outline"
              size="sm"
              className="flex-1 bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"
            >
              <Download className="size-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"
              onClick={() => document.getElementById('importPresets')?.click()}
            >
              <Upload className="size-4 mr-2" />
              Import
            </Button>
          </div>
          <input
            id="importPresets"
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportPresets}
          />
        </div>
      )}

      {/* Info */}
      {presets.length > 0 && (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-xs text-white/40">
            {presets.length} saved preset{presets.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
