// Grid Renderer Utilities
// Provides different grid styles for motion analysis background

export type GridStyle = 'square' | 'isometric' | 'polar' | 'dots';

export interface GridConfig {
  enabled: boolean;           // Enable/disable grid
  style: GridStyle;           // Grid style
  color: string;              // Line color (hex or rgba)
  size: number;               // Grid spacing in pixels
  lineWidth: number;          // Line thickness
  offsetX: number;            // Horizontal offset (0-1, where 1 = full width)
  offsetY: number;            // Vertical offset (0-1, where 1 = full height)
  rotation: number;           // Rotation angle in degrees
  opacity: number;            // Line opacity (0-1)
  backgroundColor: string;    // Background fill color
  backgroundOpacity: number;  // Background opacity (0-1)
}

// Draw grid lines (background fill handled by GridBackgroundLayer)
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GridConfig
): void {
  if (config.opacity <= 0) return;

  ctx.save();

  // Parse color (support hex with or without alpha)
  const color = parseColor(config.color);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = config.lineWidth;
  ctx.globalAlpha = config.opacity;

  // Calculate center point with offset
  const centerX = width * (0.5 + (config.offsetX - 0.5));
  const centerY = height * (0.5 + (config.offsetY - 0.5));

  // Apply rotation
  ctx.translate(centerX, centerY);
  ctx.rotate((config.rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  switch (config.style) {
    case 'square':
      drawSquareGrid(ctx, width, height, config.size, centerX, centerY);
      break;
    case 'isometric':
      drawIsometricGrid(ctx, width, height, config.size, centerX, centerY);
      break;
    case 'polar':
      drawPolarGrid(ctx, width, height, config.size, centerX, centerY);
      break;
    case 'dots':
      drawDotsGrid(ctx, width, height, config.size, centerX, centerY);
      break;
  }

  ctx.restore();
}

function parseColor(color: string): string {
  // If already rgba or rgb, return as-is
  if (color.startsWith('rgba') || color.startsWith('rgb')) {
    return color;
  }
  
  // Handle hex colors
  if (color.startsWith('#')) {
    // If 8 digits, includes alpha
    if (color.length === 9) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const a = parseInt(color.slice(7, 9), 16) / 255;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    // Standard 6-digit hex
    return color;
  }
  
  return color;
}

function drawSquareGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  size: number,
  offsetX: number,
  offsetY: number
): void {
  ctx.beginPath();

  // Vertical lines
  const startX = offsetX % size;
  for (let x = startX; x < width; x += size) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }

  // Horizontal lines
  const startY = offsetY % size;
  for (let y = startY; y < height; y += size) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }

  ctx.stroke();
}

function drawIsometricGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  size: number,
  offsetX: number,
  offsetY: number
): void {
  ctx.beginPath();

  // Isometric grid: diamond pattern
  const cellSize = size;

  // Draw lines going up-right (top-left to bottom-right)
  for (let i = -width; i < width + height; i += cellSize) {
    const startX = i + (offsetX % cellSize);
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX + height, height);
  }

  // Draw lines going up-left (top-right to bottom-left)
  for (let i = -height; i < width + height; i += cellSize) {
    const startY = i + (offsetY % cellSize);
    ctx.moveTo(width, startY);
    ctx.lineTo(0, startY + width);
  }

  ctx.stroke();
}

function drawPolarGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  size: number,
  centerX: number,
  centerY: number
): void {
  ctx.beginPath();

  const maxRadius = Math.sqrt(width * width + height * height) / 2;

  // Concentric circles
  for (let r = size; r < maxRadius; r += size) {
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
  }

  // Radial lines
  const numRadials = Math.floor((Math.PI * 2 * maxRadius) / size);
  for (let i = 0; i < numRadials; i++) {
    const angle = (i / numRadials) * Math.PI * 2;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * maxRadius,
      centerY + Math.sin(angle) * maxRadius
    );
  }

  ctx.stroke();
}

function drawDotsGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  size: number,
  offsetX: number,
  offsetY: number
): void {
  const startX = offsetX % size;
  const startY = offsetY % size;

  for (let y = startY; y < height; y += size) {
    for (let x = startX; x < width; x += size) {
      ctx.beginPath();
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
