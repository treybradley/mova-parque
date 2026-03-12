// Blob Tracking System - Core detection and rendering logic

// Reusable canvas elements for blob detection (to avoid memory leaks)
let reusableSrcCanvas: HTMLCanvasElement | null = null;
let reusableTempCanvas: HTMLCanvasElement | null = null;

function getReusableCanvas(width: number, height: number, isTemp: boolean): HTMLCanvasElement {
  const canvas = isTemp 
    ? (reusableTempCanvas || document.createElement('canvas'))
    : (reusableSrcCanvas || document.createElement('canvas'));
  
  if (isTemp) {
    reusableTempCanvas = canvas;
  } else {
    reusableSrcCanvas = canvas;
  }
  
  // Only resize if dimensions changed
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  
  return canvas;
}

export interface Blob {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  count: number;
}

export interface BlobTrackingConfig {
  // Core Settings
  enabled: boolean;
  applyBlendMode: boolean;

  // Detection Settings
  detectionMode: 'bright' | 'dark' | 'edge';
  threshold: number;
  minBlobSize: number;
  maxBlobSize: number;
  detectionInterval: number;
  smoothing: number;
  interpolateFrames: boolean;

  // Display Toggles
  showBoundingBoxes: boolean;
  showCentroids: boolean;
  showConnections: boolean;
  showText: boolean;

  // Bounding Box Settings
  boundingBoxColor: string;
  boundingBoxShape: 'square' | 'circle';
  boundingBoxSize: number;
  boundingBoxRegionStyle: 'none' | 'frame' | 'l-frame' | 'x-frame' | 'grid' | 'scope';
  boundingBoxLineWidth: number;

  // Centroid Settings
  centroidColor: string;
  centroidSize: number;

  // Connection Settings
  connectionColor: string;
  connectionStyle: 'solid' | 'dashed';
  connectionLineWidth: number;

  // Text Label Settings
  textType: 'position' | 'count';
  textFontSize: number;
  textColor: string;
}

export const DEFAULT_BLOB_CONFIG: BlobTrackingConfig = {
  enabled: true, // Blob tracking ON by default
  applyBlendMode: false,
  detectionMode: 'edge', // Detection mode: edges by default
  threshold: 255,
  minBlobSize: 500,
  maxBlobSize: 1400,
  detectionInterval: 1, // Detection interval: 1 frame by default
  smoothing: 0.711, // Smoothing: 0.711 by default
  interpolateFrames: false,
  showBoundingBoxes: true,
  showCentroids: false,
  showConnections: false,
  showText: true, // Text labels ON by default
  boundingBoxColor: '#ffb847',
  boundingBoxShape: 'square',
  boundingBoxSize: 1.10,
  boundingBoxRegionStyle: 'l-frame',
  boundingBoxLineWidth: 2,
  centroidColor: '#ff7700',
  centroidSize: 5,
  connectionColor: '#ff4400',
  connectionStyle: 'solid',
  connectionLineWidth: 1,
  textType: 'position',
  textFontSize: 12,
  textColor: '#ffb847',
};

// Detect blobs using flood-fill algorithm
function detectBlobs(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  minBlobSize: number
): Blob[] {
  const visited = new Uint8Array(width * height);
  const blobs: Blob[] = [];

  function floodFill(startX: number, startY: number): Blob | null {
    const stack: [number, number][] = [[startX, startY]];
    const blob: Blob = {
      minX: startX,
      minY: startY,
      maxX: startX,
      maxY: startY,
      cx: 0,
      cy: 0,
      count: 0,
    };

    let sumX = 0;
    let sumY = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[idx]) continue;

      const pixelIdx = idx * 4;
      const brightness = imageData[pixelIdx];
      if (brightness < threshold) continue;

      visited[idx] = 1;
      blob.count++;

      blob.minX = Math.min(blob.minX, x);
      blob.minY = Math.min(blob.minY, y);
      blob.maxX = Math.max(blob.maxX, x);
      blob.maxY = Math.max(blob.maxY, y);

      sumX += x;
      sumY += y;

      // 4-connectivity
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    if (blob.count > 0) {
      blob.cx = sumX / blob.count;
      blob.cy = sumY / blob.count;
    }

    return blob.count >= minBlobSize ? blob : null;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pixelIdx = idx * 4;
      const brightness = imageData[pixelIdx];
      if (brightness >= threshold) {
        const blob = floodFill(x, y);
        if (blob) {
          blobs.push(blob);
        }
      }
    }
  }

  return blobs;
}

// Detect blobs with downsampling for performance
export function detectBlobsFromMask(
  maskData: ImageData | null,
  threshold: number,
  minBlobSize: number,
  maxBlobSize?: number,
  detectionMode: 'bright' | 'dark' | 'edge' = 'bright'
): Blob[] {
  if (!maskData) return [];

  const w = maskData.width;
  const h = maskData.height;

  // Downsample for performance
  const MAX_PROCESS_WIDTH = 640;
  const MAX_PROCESS_HEIGHT = 480;

  let processWidth = w;
  let processHeight = h;
  let scaleX = 1;
  let scaleY = 1;

  if (w > MAX_PROCESS_WIDTH || h > MAX_PROCESS_HEIGHT) {
    const aspectRatio = w / h;
    if (w > h) {
      processWidth = MAX_PROCESS_WIDTH;
      processHeight = Math.round(MAX_PROCESS_WIDTH / aspectRatio);
    } else {
      processHeight = MAX_PROCESS_HEIGHT;
      processWidth = Math.round(MAX_PROCESS_HEIGHT * aspectRatio);
    }
    scaleX = w / processWidth;
    scaleY = h / processHeight;
  }

  let processedData: ImageData;

  if (scaleX !== 1 || scaleY !== 1) {
    // Reuse temporary canvases for downsampling (avoid memory leaks)
    const srcCanvas = getReusableCanvas(w, h, false);
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.putImageData(maskData, 0, 0);
    
    const tempCanvas = getReusableCanvas(processWidth, processHeight, true);
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Draw downsampled
    tempCtx.drawImage(srcCanvas, 0, 0, processWidth, processHeight);
    processedData = tempCtx.getImageData(0, 0, processWidth, processHeight);
  } else {
    processedData = maskData;
  }

  // Apply detection mode preprocessing
  const preprocessedData = applyDetectionMode(processedData, detectionMode);

  // Detect blobs at processed resolution
  const blobs = detectBlobs(
    preprocessedData.data,
    processWidth,
    processHeight,
    threshold,
    Math.round(minBlobSize / (scaleX * scaleY))
  );

  // Scale blob coordinates back to original resolution and filter by maxBlobSize
  const scaledBlobs = blobs.map((blob) => ({
    minX: blob.minX * scaleX,
    minY: blob.minY * scaleY,
    maxX: blob.maxX * scaleX,
    maxY: blob.maxY * scaleY,
    cx: blob.cx * scaleX,
    cy: blob.cy * scaleY,
    count: blob.count * scaleX * scaleY,
  }));

  // Filter by maxBlobSize if provided
  if (maxBlobSize !== undefined) {
    return scaledBlobs.filter((blob) => blob.count <= maxBlobSize);
  }

  return scaledBlobs;
}

// Apply detection mode preprocessing
function applyDetectionMode(
  imageData: ImageData,
  detectionMode: 'bright' | 'dark' | 'edge'
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  if (detectionMode === 'bright') {
    // No preprocessing needed for bright mode
    return imageData;
  } else if (detectionMode === 'dark') {
    // Invert brightness for dark mode
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
    }
  } else if (detectionMode === 'edge') {
    // Apply Sobel edge detection
    // Reuse array if possible (but edge detection modifies data, so we need a copy)
    // For now, we create new array but this is necessary for edge detection
    const edgeData = new Uint8ClampedArray(data.length);
    const kernelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    const kernelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const pixel = data[idx];
            gx += pixel * kernelX[ky + 1][kx + 1];
            gy += pixel * kernelY[ky + 1][kx + 1];
          }
        }

        const edge = Math.sqrt(gx * gx + gy * gy);
        const edgeIdx = (y * width + x) * 4;
        edgeData[edgeIdx] = edge;
        edgeData[edgeIdx + 1] = edge;
        edgeData[edgeIdx + 2] = edge;
        edgeData[edgeIdx + 3] = 255;
      }
    }

    return new ImageData(edgeData, width, height);
  }

  return imageData;
}

// Render bounding boxes
function renderBoundingBoxes(
  ctx: CanvasRenderingContext2D,
  blobs: Blob[],
  cfg: BlobTrackingConfig
): void {
  ctx.strokeStyle = cfg.boundingBoxColor;
  ctx.lineWidth = cfg.boundingBoxLineWidth;

  blobs.forEach((blob) => {
    const width = blob.maxX - blob.minX;
    const height = blob.maxY - blob.minY;
    const centerX = blob.cx;
    const centerY = blob.cy;

    const scaledWidth = width * cfg.boundingBoxSize;
    const scaledHeight = height * cfg.boundingBoxSize;
    const x = centerX - scaledWidth / 2;
    const y = centerY - scaledHeight / 2;

    if (cfg.boundingBoxShape === 'square') {
      switch (cfg.boundingBoxRegionStyle) {
        case 'frame':
          ctx.strokeRect(x, y, scaledWidth, scaledHeight);
          break;

        case 'l-frame': {
          const cornerLen = Math.min(scaledWidth, scaledHeight) * 0.2;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(x, y + cornerLen);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerLen, y);
          ctx.stroke();
          // Top-right
          ctx.beginPath();
          ctx.moveTo(x + scaledWidth - cornerLen, y);
          ctx.lineTo(x + scaledWidth, y);
          ctx.lineTo(x + scaledWidth, y + cornerLen);
          ctx.stroke();
          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(x, y + scaledHeight - cornerLen);
          ctx.lineTo(x, y + scaledHeight);
          ctx.lineTo(x + cornerLen, y + scaledHeight);
          ctx.stroke();
          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(x + scaledWidth - cornerLen, y + scaledHeight);
          ctx.lineTo(x + scaledWidth, y + scaledHeight);
          ctx.lineTo(x + scaledWidth, y + scaledHeight - cornerLen);
          ctx.stroke();
          break;
        }

        case 'x-frame': {
          // Frame with X in the middle
          ctx.strokeRect(x, y, scaledWidth, scaledHeight);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + scaledWidth, y + scaledHeight);
          ctx.moveTo(x + scaledWidth, y);
          ctx.lineTo(x, y + scaledHeight);
          ctx.stroke();
          break;
        }

        case 'grid':
          ctx.strokeRect(x, y, scaledWidth, scaledHeight);
          ctx.beginPath();
          ctx.moveTo(x + scaledWidth / 3, y);
          ctx.lineTo(x + scaledWidth / 3, y + scaledHeight);
          ctx.moveTo(x + (2 * scaledWidth) / 3, y);
          ctx.lineTo(x + (2 * scaledWidth) / 3, y + scaledHeight);
          ctx.moveTo(x, y + scaledHeight / 3);
          ctx.lineTo(x + scaledWidth, y + scaledHeight / 3);
          ctx.moveTo(x, y + (2 * scaledHeight) / 3);
          ctx.lineTo(x + scaledWidth, y + (2 * scaledHeight) / 3);
          ctx.stroke();
          break;

        case 'scope':
          ctx.strokeRect(x, y, scaledWidth, scaledHeight);
          ctx.beginPath();
          ctx.moveTo(centerX, y);
          ctx.lineTo(centerX, y + scaledHeight);
          ctx.moveTo(x, centerY);
          ctx.lineTo(x + scaledWidth, centerY);
          ctx.stroke();
          // Center circle
          ctx.beginPath();
          ctx.arc(centerX, centerY, Math.min(scaledWidth, scaledHeight) * 0.1, 0, Math.PI * 2);
          ctx.stroke();
          break;

        default:
          ctx.strokeRect(x, y, scaledWidth, scaledHeight);
      }
    } else if (cfg.boundingBoxShape === 'circle') {
      const radius = Math.max(scaledWidth, scaledHeight) / 2;
      switch (cfg.boundingBoxRegionStyle) {
        case 'frame':
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'l-frame': {
          const gap = 0.35;
          const arcLen = Math.PI / 2 - gap;
          for (let i = 0; i < 4; i++) {
            const start = i * (Math.PI / 2) + gap / 2;
            const end = start + arcLen;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, start, end);
            ctx.stroke();
          }
          break;
        }

        case 'x-frame':
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(centerX - radius, centerY - radius);
          ctx.lineTo(centerX + radius, centerY + radius);
          ctx.moveTo(centerX + radius, centerY - radius);
          ctx.lineTo(centerX - radius, centerY + radius);
          ctx.stroke();
          break;

        case 'grid':
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2;
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + radius * Math.cos(a), centerY + radius * Math.sin(a));
          }
          for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + (i * Math.PI) / 2;
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + radius * Math.cos(a), centerY + radius * Math.sin(a));
          }
          ctx.stroke();
          break;

        case 'scope':
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - radius);
          ctx.lineTo(centerX, centerY + radius);
          ctx.moveTo(centerX - radius, centerY);
          ctx.lineTo(centerX + radius, centerY);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * 0.1, 0, Math.PI * 2);
          ctx.stroke();
          break;

        default:
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
      }
    }
  });
}

// Render centroids
function renderCentroids(
  ctx: CanvasRenderingContext2D,
  blobs: Blob[],
  cfg: BlobTrackingConfig
): void {
  ctx.fillStyle = cfg.centroidColor;

  blobs.forEach((blob) => {
    ctx.beginPath();
    ctx.arc(blob.cx, blob.cy, cfg.centroidSize, 0, Math.PI * 2);
    ctx.fill();

    // Crosshair
    ctx.strokeStyle = cfg.centroidColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(blob.cx - cfg.centroidSize * 2, blob.cy);
    ctx.lineTo(blob.cx + cfg.centroidSize * 2, blob.cy);
    ctx.moveTo(blob.cx, blob.cy - cfg.centroidSize * 2);
    ctx.lineTo(blob.cx, blob.cy + cfg.centroidSize * 2);
    ctx.stroke();
  });
}

// Render connections
function renderConnections(
  ctx: CanvasRenderingContext2D,
  blobs: Blob[],
  cfg: BlobTrackingConfig
): void {
  ctx.strokeStyle = cfg.connectionColor;
  ctx.lineWidth = cfg.connectionLineWidth;

  if (cfg.connectionStyle === 'dashed') {
    ctx.setLineDash([10, 5]);
  } else {
    ctx.setLineDash([]);
  }

  for (let i = 0; i < blobs.length; i++) {
    for (let j = i + 1; j < blobs.length; j++) {
      ctx.beginPath();
      ctx.moveTo(blobs[i].cx, blobs[i].cy);
      ctx.lineTo(blobs[j].cx, blobs[j].cy);
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);
}

// Render text labels
function renderTextLabels(
  ctx: CanvasRenderingContext2D,
  blobs: Blob[],
  cfg: BlobTrackingConfig
): void {
  ctx.fillStyle = cfg.textColor;
  ctx.font = `${cfg.textFontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  blobs.forEach((blob) => {
    let text: string;
    if (cfg.textType === 'position') {
      text = `(${Math.round(blob.cx)}, ${Math.round(blob.cy)})`;
    } else {
      text = `${blob.count} px`;
    }

    const textX = blob.cx;
    const textY = blob.maxY + 10;

    // Text background
    const metrics = ctx.measureText(text);
    const padding = 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      textX - metrics.width / 2 - padding,
      textY - padding,
      metrics.width + padding * 2,
      cfg.textFontSize + padding * 2
    );

    // Text
    ctx.fillStyle = cfg.textColor;
    ctx.fillText(text, textX, textY);
  });
}

// Main render function
export function renderBlobTracking(
  ctx: CanvasRenderingContext2D,
  maskData: ImageData | null,
  canvasWidth: number,
  canvasHeight: number,
  config: BlobTrackingConfig
): void {
  if (!config.enabled || !maskData) return;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();

  // Detect blobs
  const blobs = detectBlobsFromMask(maskData, config.threshold, config.minBlobSize, config.maxBlobSize, config.detectionMode);

  // Scale context to canvas display size
  const scaleX = canvasWidth / maskData.width;
  const scaleY = canvasHeight / maskData.height;
  ctx.scale(scaleX, scaleY);

  // Render in order: boxes, connections, centroids, text
  if (config.showBoundingBoxes) {
    renderBoundingBoxes(ctx, blobs, config);
  }

  if (config.showConnections && blobs.length > 1) {
    renderConnections(ctx, blobs, config);
  }

  if (config.showCentroids) {
    renderCentroids(ctx, blobs, config);
  }

  if (config.showText) {
    renderTextLabels(ctx, blobs, config);
  }

  ctx.restore();
}

// Smooth blob positions using exponential moving average
export function smoothBlobs(
  currentBlobs: Blob[],
  previousBlobs: Blob[],
  smoothingFactor: number
): Blob[] {
  if (previousBlobs.length === 0 || smoothingFactor === 0) {
    return currentBlobs;
  }

  // Simple nearest-neighbor matching
  return currentBlobs.map((current) => {
    // Find closest previous blob by centroid distance
    let closestPrev: Blob | null = null;
    let minDist = Infinity;

    for (const prev of previousBlobs) {
      const dx = current.cx - prev.cx;
      const dy = current.cy - prev.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist && dist < 200) { // Max 200px movement threshold
        minDist = dist;
        closestPrev = prev;
      }
    }

    // If no match found, use current blob as-is
    if (!closestPrev) {
      return current;
    }

    // Apply exponential moving average
    const alpha = 1 - smoothingFactor;
    return {
      minX: alpha * current.minX + smoothingFactor * closestPrev.minX,
      minY: alpha * current.minY + smoothingFactor * closestPrev.minY,
      maxX: alpha * current.maxX + smoothingFactor * closestPrev.maxX,
      maxY: alpha * current.maxY + smoothingFactor * closestPrev.maxY,
      cx: alpha * current.cx + smoothingFactor * closestPrev.cx,
      cy: alpha * current.cy + smoothingFactor * closestPrev.cy,
      count: current.count, // Don't smooth count
    };
  });
}