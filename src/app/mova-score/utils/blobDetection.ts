import { Blob, TrackingSettings } from '@/app/mova-score/types';

// Performance limits to prevent crashes
const MAX_BLOBS = 30; // Maximum number of blobs to detect (strict limit for performance)
const MAX_BLOB_PIXELS = 28000; // Maximum pixels per blob (prevents huge flood fills)
const SCAN_STEP = 3; // Skip pixels during initial scan for performance

// Simple color distance calculation
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// Convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Color-based blob detection
function detectColorBlobs(
  imageData: ImageData,
  settings: TrackingSettings
): Blob[] {
  const { width, height, data } = imageData;
  const targetRgb = hexToRgb(settings.targetColor || '#ff0000');
  const visited = new Array(width * height).fill(false);
  const blobs: Blob[] = [];
  
  // Flood fill to find connected regions
  function floodFill(startX: number, startY: number): { pixels: [number, number][] } | null {
    const stack: [number, number][] = [[startX, startY]];
    const pixels: [number, number][] = [];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;
      
      const pixelIdx = idx * 4;
      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];
      
      const distance = colorDistance(r, g, b, targetRgb.r, targetRgb.g, targetRgb.b);
      
      if (distance > settings.tolerance * 255) continue;
      
      visited[idx] = true;
      pixels.push([x, y]);
      if (pixels.length > MAX_BLOB_PIXELS) {
        return null;
      }

      // Check 4-connected neighbors
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return pixels.length >= settings.minBlobSize && pixels.length <= settings.maxBlobSize ? { pixels } : null;
  }

  // Scan for blobs
  for (let y = 0; y < height; y += SCAN_STEP) {
    for (let x = 0; x < width; x += SCAN_STEP) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pixelIdx = idx * 4;
      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];

      const distance = colorDistance(r, g, b, targetRgb.r, targetRgb.g, targetRgb.b);

      if (distance <= settings.tolerance * 255) {
        const result = floodFill(x, y);
        if (result) {
          const { pixels } = result;
          const xs = pixels.map(p => p[0]);
          const ys = pixels.map(p => p[1]);
          
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          blobs.push({
            id: `blob-${blobs.length}`,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX,
            centerY,
            size: pixels.length,
            velocity: 0
          });
          
          if (blobs.length >= MAX_BLOBS) {
            return blobs;
          }
        }
      }
    }
  }
  
  return blobs;
}

// Luminance-based blob detection
function detectLuminanceBlobs(
  imageData: ImageData,
  settings: TrackingSettings
): Blob[] {
  const { width, height, data } = imageData;
  const visited = new Array(width * height).fill(false);
  const blobs: Blob[] = [];
  const threshold = settings.tolerance * 255;
  
  function floodFill(startX: number, startY: number): { pixels: [number, number][] } | null {
    const stack: [number, number][] = [[startX, startY]];
    const pixels: [number, number][] = [];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;
      
      const pixelIdx = idx * 4;
      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (luminance < threshold) continue;
      
      visited[idx] = true;
      pixels.push([x, y]);
      if (pixels.length > MAX_BLOB_PIXELS) {
        return null;
      }

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return pixels.length >= settings.minBlobSize && pixels.length <= settings.maxBlobSize ? { pixels } : null;
  }

  for (let y = 0; y < height; y += SCAN_STEP) {
    for (let x = 0; x < width; x += SCAN_STEP) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pixelIdx = idx * 4;
      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      if (luminance >= threshold) {
        const result = floodFill(x, y);
        if (result) {
          const { pixels } = result;
          const xs = pixels.map(p => p[0]);
          const ys = pixels.map(p => p[1]);
          
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          blobs.push({
            id: `blob-${blobs.length}`,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX,
            centerY,
            size: pixels.length,
            velocity: 0
          });
          
          if (blobs.length >= MAX_BLOBS) {
            return blobs;
          }
        }
      }
    }
  }
  
  return blobs;
}

// Edge detection using Sobel operator
function detectEdgeBlobs(
  imageData: ImageData,
  settings: TrackingSettings
): Blob[] {
  const { width, height, data } = imageData;
  const edges = new Uint8ClampedArray(width * height);
  
  // Convert to grayscale and apply Sobel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Get 3x3 neighborhood
      const getPixel = (dx: number, dy: number) => {
        const i = ((y + dy) * width + (x + dx)) * 4;
        return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      };
      
      // Sobel operators
      const gx = -getPixel(-1, -1) - 2 * getPixel(-1, 0) - getPixel(-1, 1) +
                  getPixel(1, -1) + 2 * getPixel(1, 0) + getPixel(1, 1);
      
      const gy = -getPixel(-1, -1) - 2 * getPixel(0, -1) - getPixel(1, -1) +
                  getPixel(-1, 1) + 2 * getPixel(0, 1) + getPixel(1, 1);
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = magnitude > settings.tolerance * 255 ? 255 : 0;
    }
  }
  
  // Find connected edge components
  const visited = new Array(width * height).fill(false);
  const blobs: Blob[] = [];
  
  function floodFill(startX: number, startY: number): { pixels: [number, number][] } | null {
    const stack: [number, number][] = [[startX, startY]];
    const pixels: [number, number][] = [];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || edges[idx] === 0) continue;
      
      visited[idx] = true;
      pixels.push([x, y]);
      if (pixels.length > MAX_BLOB_PIXELS) {
        return null;
      }

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return pixels.length >= settings.minBlobSize && pixels.length <= settings.maxBlobSize ? { pixels } : null;
  }

  for (let y = 0; y < height; y += SCAN_STEP) {
    for (let x = 0; x < width; x += SCAN_STEP) {
      const idx = y * width + x;
      if (visited[idx] || edges[idx] === 0) continue;

      const result = floodFill(x, y);
      if (result) {
        const { pixels } = result;
        const xs = pixels.map(p => p[0]);
        const ys = pixels.map(p => p[1]);
        
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        blobs.push({
          id: `blob-${blobs.length}`,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          centerX,
          centerY,
          size: pixels.length,
          velocity: 0
        });
        
        if (blobs.length >= MAX_BLOBS) {
          return blobs;
        }
      }
    }
  }
  
  return blobs;
}

// Main blob detection function
export function detectBlobs(
  imageData: ImageData,
  settings: TrackingSettings
): Blob[] {
  switch (settings.mode) {
    case 'color':
      return detectColorBlobs(imageData, settings);
    case 'luminance':
      return detectLuminanceBlobs(imageData, settings);
    case 'edge':
      return detectEdgeBlobs(imageData, settings);
    default:
      return [];
  }
}
