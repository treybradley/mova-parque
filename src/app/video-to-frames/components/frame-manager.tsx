import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Check, X, Grid3x3, List, Search, RotateCcw } from 'lucide-react';
import { ExtractedFrame } from '../VideoToFramesApp';

interface FrameManagerProps {
  allFrames: ExtractedFrame[];
  selectedFrames: ExtractedFrame[];
  onSelectedFramesChange: (frames: ExtractedFrame[]) => void;
}

function FrameItem({ frame, isSelected, onToggle }: {
  frame: ExtractedFrame;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`relative group cursor-pointer`}
      onClick={onToggle}
    >
      <div className="relative rounded-lg overflow-hidden border-2" style={{
        borderColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
      }}>
        <img
          src={frame.dataUrl}
          alt={`Frame ${frame.frameNumber}`}
          className="w-full aspect-video object-cover"
        />

        {/* Overlay */}
        <div
          className="absolute inset-0 transition-opacity pointer-events-none"
          style={{
            backgroundColor: isSelected ? 'transparent' : 'rgba(0, 0, 0, 0.3)',
            opacity: isSelected ? 0 : 1,
          }}
        />

        {/* Selection checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`absolute top-2 right-2 w-6 h-6 rounded-sm flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}
        >
          {isSelected ? <Check className="size-3" /> : null}
        </button>

        {/* Frame number */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-sm bg-white/10 text-white/70 text-xs">
          #{frame.frameNumber}
        </div>
      </div>
    </div>
  );
}

export function FrameManager({ allFrames, selectedFrames, onSelectedFramesChange }: FrameManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleToggleFrame = (frame: ExtractedFrame) => {
    const isSelected = selectedFrames.some(f => f.id === frame.id);
    if (isSelected) {
      onSelectedFramesChange(selectedFrames.filter(f => f.id !== frame.id));
    } else {
      const newSelected = [...selectedFrames, frame];
      newSelected.sort((a, b) => {
        const indexA = allFrames.findIndex(f => f.id === a.id);
        const indexB = allFrames.findIndex(f => f.id === b.id);
        return indexA - indexB;
      });
      onSelectedFramesChange(newSelected);
    }
  };

  const handleSelectAll = () => {
    onSelectedFramesChange(allFrames);
  };

  const handleDeselectAll = () => {
    onSelectedFramesChange([]);
  };

  const handleReset = () => {
    onSelectedFramesChange(allFrames);
  };

  const filteredFrames = searchTerm
    ? allFrames.filter(f =>
        f.frameNumber.toString().includes(searchTerm) ||
        f.timestamp.toFixed(2).includes(searchTerm)
      )
    : allFrames;

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
          <Input
            placeholder="Search by frame # or time..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white/70 placeholder:text-white/30"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button onClick={handleSelectAll} variant="outline" size="sm" className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80">
              <Check className="size-3 mr-1" />
              All
            </Button>
            <Button onClick={handleDeselectAll} variant="outline" size="sm" className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80">
              <X className="size-3 mr-1" />
              None
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm" className="bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80">
              <RotateCcw className="size-3 mr-1" />
              Reset
            </Button>
          </div>

          <div className="flex gap-1 p-1 rounded bg-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white/20 text-white'
                  : 'bg-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <Grid3x3 className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-white/20 text-white'
                  : 'bg-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 rounded-lg flex items-center justify-between bg-white/10 text-white/70">
        <span className="text-xs">Selected</span>
        <span className="text-sm font-medium">{selectedFrames.length} of {allFrames.length}</span>
      </div>

      {/* Frame Grid */}
      <div className="rounded-lg p-4 max-h-96 overflow-y-auto bg-white/5 border border-white/10">
        <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-3' : 'space-y-2'}>
          {filteredFrames.map(frame => {
            const isSelected = selectedFrames.some(f => f.id === frame.id);
            return (
              <FrameItem
                key={frame.id}
                frame={frame}
                isSelected={isSelected}
                onToggle={() => handleToggleFrame(frame)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
