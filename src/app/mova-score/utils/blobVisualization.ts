import { Blob, VisualSettings } from '@/app/mova-score/types';

export function drawBlobs(
  ctx: CanvasRenderingContext2D,
  blobs: Blob[],
  settings: VisualSettings
) {
  ctx.save();
  
  // Draw connections first (behind boxes)
  if (settings.showConnections && blobs.length > 1) {
    ctx.strokeStyle = settings.connectionColor;
    ctx.lineWidth = settings.connectionWeight;
    ctx.globalAlpha = settings.connectionOpacity;
    
    // Set line dash style
    switch (settings.connectionLineStyle) {
      case 'dashed':
        ctx.setLineDash([10, 5]);
        break;
      case 'dotted':
        ctx.setLineDash([2, 3]);
        break;
      default:
        ctx.setLineDash([]);
    }
    
    // Draw lines between all blob pairs
    for (let i = 0; i < blobs.length; i++) {
      for (let j = i + 1; j < blobs.length; j++) {
        ctx.beginPath();
        ctx.moveTo(blobs[i].centerX, blobs[i].centerY);
        ctx.lineTo(blobs[j].centerX, blobs[j].centerY);
        ctx.stroke();
      }
    }
    
    ctx.setLineDash([]);
  }
  
  // Draw boxes
  if (settings.showBoxes && settings.boxType !== 'none') {
    ctx.strokeStyle = settings.boxColor;
    ctx.lineWidth = settings.boxWeight;
    ctx.globalAlpha = settings.boxOpacity;
    
    blobs.forEach(blob => {
      ctx.beginPath();
      
      const { x, y, width, height, centerX, centerY } = blob;
      const cornerSize = Math.min(width, height) * 0.2; // 20% of smallest dimension
      
      switch (settings.boxType) {
        case 'rectangle':
          ctx.rect(x, y, width, height);
          break;
          
        case 'circle': {
          const radius = Math.max(width, height) / 2;
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          break;
        }
        
        case 'l-frame':
          // Top-left L
          ctx.moveTo(x, y + cornerSize);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerSize, y);
          break;
          
        case 'x-frame':
          // Diagonal cross through the box
          ctx.moveTo(x, y);
          ctx.lineTo(x + width, y + height);
          ctx.moveTo(x + width, y);
          ctx.lineTo(x, y + height);
          break;
          
        case 'scope':
          // Crosshair centered on the blob
          ctx.moveTo(centerX - width / 4, centerY);
          ctx.lineTo(centerX + width / 4, centerY);
          ctx.moveTo(centerX, centerY - height / 4);
          ctx.lineTo(centerX, centerY + height / 4);
          // Outer circle
          const scopeRadius = Math.max(width, height) / 2;
          ctx.moveTo(centerX + scopeRadius, centerY);
          ctx.arc(centerX, centerY, scopeRadius, 0, Math.PI * 2);
          break;
          
        case 'corners':
          // Four corner brackets
          // Top-left
          ctx.moveTo(x, y + cornerSize);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerSize, y);
          // Top-right
          ctx.moveTo(x + width - cornerSize, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y + cornerSize);
          // Bottom-right
          ctx.moveTo(x + width, y + height - cornerSize);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x + width - cornerSize, y + height);
          // Bottom-left
          ctx.moveTo(x + cornerSize, y + height);
          ctx.lineTo(x, y + height);
          ctx.lineTo(x, y + height - cornerSize);
          break;
      }
      
      ctx.stroke();
    });
  }
  
  // Draw centroids
  if (settings.showCentroids && settings.centroidType !== 'none') {
    ctx.fillStyle = settings.centroidColor;
    ctx.strokeStyle = settings.centroidColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = settings.centroidOpacity;
    
    blobs.forEach(blob => {
      const { centerX, centerY } = blob;
      const size = settings.centroidSize;
      
      ctx.beginPath();
      
      switch (settings.centroidType) {
        case 'dot':
          ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
          ctx.fill();
          break;
        
        case 'cross':
          ctx.moveTo(centerX - size, centerY);
          ctx.lineTo(centerX + size, centerY);
          ctx.moveTo(centerX, centerY - size);
          ctx.lineTo(centerX, centerY + size);
          ctx.stroke();
          break;
        
        case 'circle':
          ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
          ctx.stroke();
          break;
      }
    });
  }
  
  ctx.restore();
}
