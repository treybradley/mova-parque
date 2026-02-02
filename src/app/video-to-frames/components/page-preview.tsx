import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageConfig, ExtractedFrame } from '../VideoToFramesApp';
import jsPDF from 'jspdf';
import { Ruler } from './ruler';

interface PagePreviewProps {
  frames: ExtractedFrame[];
  config: PageConfig;
  videoFPS: number;
  showRulers: boolean;
  rulerUnit: 'in' | 'cm';
}

export interface PagePreviewHandle {
  print: () => void;
  downloadPage: () => void;
  downloadAllPages: () => void;
  downloadPDF: () => Promise<void>;
  getPreviewData: () => {
    totalFrames: number;
    totalPages: number;
    framesPerPage: number;
    currentPage: number;
  };
}

export const PagePreview = forwardRef<PagePreviewHandle, PagePreviewProps>(({ frames, config, videoFPS: _videoFPS, showRulers, rulerUnit }, ref) => {
  const [currentPage, setCurrentPage] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  
  const framesPerPage = config.gridRows * config.gridCols;
  const totalPages = Math.ceil(frames.length / framesPerPage);

  // Load images for current page
  useEffect(() => {
    const startIdx = currentPage * framesPerPage;
    const endIdx = Math.min(startIdx + framesPerPage, frames.length);
    const pageFrames = frames.slice(startIdx, endIdx);

    // Check if all images for this page are already loaded
    const allLoaded = pageFrames.every(frame => loadedImages.has(frame.id));
    if (allLoaded) {
      return;
    }

    setIsLoading(true);

    const imagePromises = pageFrames.map((frame) => {
      return new Promise<{ id: string; img: HTMLImageElement }>((resolve) => {
        if (loadedImages.has(frame.id)) {
          resolve({ id: frame.id, img: loadedImages.get(frame.id)! });
          return;
        }
        const img = new Image();
        img.onload = () => {
          resolve({ id: frame.id, img });
        };
        img.onerror = () => {
          console.error('Failed to load image:', frame.id);
          resolve({ id: frame.id, img }); // Still resolve to not block other images
        };
        img.src = frame.dataUrl;
      });
    });

    Promise.all(imagePromises).then((results) => {
      setLoadedImages(prev => {
        const newMap = new Map(prev);
        results.forEach(({ id, img }) => {
          newMap.set(id, img);
        });
        return newMap;
      });
      setIsLoading(false);
    });
  }, [frames, currentPage, framesPerPage]);

  // Render canvas whenever loadedImages or config changes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/1e17813c-178a-4e43-9cd3-af84e872e1fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-preview.tsx:83',message:'Render effect triggered',data:{isLoading,hasCanvas:!!canvasRef.current,showRulers,loadedImagesCount:loadedImages.size,currentPage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (!isLoading && canvasRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/1e17813c-178a-4e43-9cd3-af84e872e1fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-preview.tsx:87',message:'About to call renderPage',data:{canvasWidth:canvasRef.current?.width,canvasHeight:canvasRef.current?.height,showRulers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      renderPage(currentPage);
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/1e17813c-178a-4e43-9cd3-af84e872e1fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-preview.tsx:90',message:'Render skipped',data:{isLoading,hasCanvas:!!canvasRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    }
  }, [loadedImages, config, currentPage, isLoading, showRulers, frames]);

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  const renderPage = (pageIndex: number) => {
    const canvas = canvasRef.current;
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/1e17813c-178a-4e43-9cd3-af84e872e1fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-preview.tsx:95',message:'renderPage called',data:{hasCanvas:!!canvas,canvasWidth:canvas?.width,canvasHeight:canvas?.height,pageIndex,showRulers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (!canvas) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/1e17813c-178a-4e43-9cd3-af84e872e1fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-preview.tsx:98',message:'renderPage early return - no canvas',data:{showRulers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/1e17813c-178a-4e43-9cd3-af84e872e1fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-preview.tsx:102',message:'renderPage early return - no context',data:{showRulers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Set canvas size (using higher DPI for better quality)
    const dpi = 2;
    const mmToPixel = 3.7795275591; // at 96 DPI
    const scale = dpi;
    
    const newWidth = config.width * mmToPixel * scale;
    const newHeight = config.height * mmToPixel * scale;
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/1e17813c-178a-4e43-9cd3-af84e872e1fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-preview.tsx:107',message:'Setting canvas dimensions',data:{beforeWidth:canvas.width,beforeHeight:canvas.height,newWidth,newHeight,showRulers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    canvas.width = newWidth;
    canvas.height = newHeight;
    canvas.style.width = `${config.width * mmToPixel}px`;
    canvas.style.height = `${config.height * mmToPixel}px`;

    ctx.scale(scale, scale);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw registration marks if enabled
    if (config.showRegistrationMarks) {
      drawRegistrationMarks(ctx, config.width * mmToPixel, config.height * mmToPixel);
    }

    // Calculate frame dimensions
    const marginPx = config.margin * mmToPixel;
    const spacingPx = config.spacing * mmToPixel;
    const availableWidth = (config.width * mmToPixel) - (2 * marginPx);
    const availableHeight = (config.height * mmToPixel) - (2 * marginPx);
    
    const frameWidth = (availableWidth - (config.gridCols - 1) * spacingPx) / config.gridCols;
    const frameHeight = (availableHeight - (config.gridRows - 1) * spacingPx) / config.gridRows;

    // Get frames for this page
    const startIdx = pageIndex * framesPerPage;
    const endIdx = Math.min(startIdx + framesPerPage, frames.length);
    const pageFrames = frames.slice(startIdx, endIdx);

    // Draw frames
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/1e17813c-178a-4e43-9cd3-af84e872e1fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-preview.tsx:137',message:'About to draw frames',data:{pageFramesCount:pageFrames.length,loadedImagesCount:loadedImages.size,showRulers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    pageFrames.forEach((frame, idx) => {
        const row = Math.floor(idx / config.gridCols);
        const col = idx % config.gridCols;
        const x = marginPx + col * (frameWidth + spacingPx);
        const y = marginPx + row * (frameHeight + spacingPx);

        // Draw frame border first
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, frameWidth, frameHeight);

        const img = loadedImages.get(frame.id);
        // #region agent log
        if (idx === 0) fetch('http://127.0.0.1:7244/ingest/1e17813c-178a-4e43-9cd3-af84e872e1fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-preview.tsx:150',message:'Frame image check',data:{frameId:frame.id,hasImage:!!img,imgWidth:img?.width,imgHeight:img?.height,showRulers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        if (img) {
          drawFrameImage(ctx, img, x, y, frameWidth, frameHeight, config);
        }

        // Draw cut guides AFTER images (so they're visible on top)
        if (config.showCutGuides) {
          ctx.save();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 4]);
          ctx.strokeRect(x, y, frameWidth, frameHeight);
          ctx.setLineDash([]);
          ctx.restore();
        }

        if (config.showFrameNumbers) {
          drawFrameNumber(ctx, startIdx + idx + 1, x, y, frameWidth, frameHeight, config.frameNumberPosition, config.showTimecodes);
        }

        if (config.showTimecodes) {
          drawTimecode(ctx, formatTimecode(frame.timestamp), x, y, frameWidth, frameHeight, config.showFrameNumbers, config.frameNumberPosition);
        }
      });
  };

  const drawFrameImage = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    frameWidth: number,
    frameHeight: number,
    config: PageConfig
  ) => {
    const padding = 8;
    const bottomSpace = (config.showFrameNumbers || config.showTimecodes) ? 24 : padding;
    
    // Calculate aspect-fit dimensions
    const imgAspect = img.width / img.height;
    const availableFrameWidth = frameWidth - (padding * 2);
    const availableFrameHeight = frameHeight - padding - bottomSpace;
    const frameAspect = availableFrameWidth / availableFrameHeight;
    
    let drawWidth = availableFrameWidth;
    let drawHeight = availableFrameHeight;

    if (imgAspect > frameAspect) {
      drawHeight = drawWidth / imgAspect;
    } else {
      drawWidth = drawHeight * imgAspect;
    }

    const drawX = x + (frameWidth - drawWidth) / 2;
    const drawY = y + (availableFrameHeight - drawHeight) / 2 + padding;

    // Apply filters if needed
    if (config.blackAndWhite || config.contrast !== 100) {
      ctx.save();
      
      // Create a temporary canvas for filters
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = drawWidth;
      tempCanvas.height = drawHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0, drawWidth, drawHeight);
        
        if (config.blackAndWhite) {
          const imageData = tempCtx.getImageData(0, 0, drawWidth, drawHeight);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }
          
          // Apply contrast
          if (config.contrast !== 100) {
            const factor = (259 * (config.contrast + 255)) / (255 * (259 - config.contrast));
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
              data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
              data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
            }
          }
          
          tempCtx.putImageData(imageData, 0, 0);
        }
        
        ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);
      }
      
      ctx.restore();
    } else {
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }
  };

  const drawFrameNumber = (
    ctx: CanvasRenderingContext2D,
    frameNumber: number,
    x: number,
    y: number,
    frameWidth: number,
    frameHeight: number,
    position: string,
    showTimecodes: boolean
  ) => {
    ctx.fillStyle = '#4b5563';
    ctx.font = 'bold 11px Roboto, sans-serif';
    
    const text = `#${frameNumber}`;
    ctx.measureText(text); // for font baseline
    const padding = 6;
    
    // When both are shown and position is at bottom, display inline
    const _isBottomPosition = position === 'bottom-center' || position === 'bottom-left' || position === 'bottom-right';
    const offset = (showTimecodes && _isBottomPosition) ? 6 : 0; // Offset frame number to the left when timecode is also shown
    
    let textX = x + frameWidth / 2 - offset;
    let textY = y + frameHeight - padding - 2;
    ctx.textAlign = 'center';
    
    if (position === 'top-left') {
      textX = x + padding;
      textY = y + padding + 11;
      ctx.textAlign = 'left';
    } else if (position === 'top-right') {
      textX = x + frameWidth - padding;
      textY = y + padding + 11;
      ctx.textAlign = 'right';
    } else if (position === 'bottom-left') {
      textX = x + padding;
      textY = y + frameHeight - padding - 2;
      ctx.textAlign = 'left';
    } else if (position === 'bottom-right') {
      textX = x + frameWidth - padding;
      textY = y + frameHeight - padding - 2;
      ctx.textAlign = 'right';
    }
    
    // If both are shown at bottom center, shift frame number left
    if (showTimecodes && position === 'bottom-center') {
      ctx.textAlign = 'right';
      textX = x + frameWidth / 2 - 3;
    }
    
    ctx.fillText(text, textX, textY);
  };

  const drawTimecode = (
    ctx: CanvasRenderingContext2D,
    timecode: string,
    x: number,
    y: number,
    frameWidth: number,
    frameHeight: number,
    showFrameNumbers: boolean,
    frameNumberPosition: string
  ) => {
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px Roboto, sans-serif';
    
    let textX = x + frameWidth / 2;
    let textY = y + frameHeight - 6;
    ctx.textAlign = 'center';
    
    // If both are shown at bottom center, shift timecode right
    if (showFrameNumbers && frameNumberPosition === 'bottom-center') {
      ctx.textAlign = 'left';
      textX = x + frameWidth / 2 + 3;
    } else if (showFrameNumbers && frameNumberPosition === 'bottom-left') {
      // If frame number is at bottom-left, show timecode at bottom-right
      ctx.textAlign = 'right';
      textX = x + frameWidth - 6;
    } else if (showFrameNumbers && frameNumberPosition === 'bottom-right') {
      // If frame number is at bottom-right, show timecode at bottom-left
      ctx.textAlign = 'left';
      textX = x + 6;
    }
    
    ctx.fillText(timecode, textX, textY);
  };

  const drawRegistrationMarks = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const markSize = 10;
    const margin = 5;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    
    // Top-left
    ctx.beginPath();
    ctx.moveTo(margin, margin + markSize);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + markSize, margin);
    ctx.stroke();
    
    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - margin - markSize, margin);
    ctx.lineTo(width - margin, margin);
    ctx.lineTo(width - margin, margin + markSize);
    ctx.stroke();
    
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(margin, height - margin - markSize);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(margin + markSize, height - margin);
    ctx.stroke();
    
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - margin - markSize, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.lineTo(width - margin, height - margin - markSize);
    ctx.stroke();
    
    // Center crosshair
    ctx.beginPath();
    ctx.moveTo(width / 2 - markSize, height / 2);
    ctx.lineTo(width / 2 + markSize, height / 2);
    ctx.moveTo(width / 2, height / 2 - markSize);
    ctx.lineTo(width / 2, height / 2 + markSize);
    ctx.stroke();
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Frames - Page ${currentPage + 1}</title>
          <style>
            body { margin: 0; padding: 0; }
            img { 
              display: block; 
              width: 100%; 
              height: 100vh;
              object-fit: contain;
            }
            @media print {
              img { 
                max-width: 100%;
                height: auto;
                page-break-after: avoid;
              }
              @page {
                margin: 0;
                size: ${config.orientation === 'portrait' ? 'portrait' : 'landscape'};
              }
            }
          </style>
        </head>
        <body>
          <img src="${canvas.toDataURL('image/png')}" />
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `frames-page-${currentPage + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleDownloadAll = () => {
    for (let i = 0; i < totalPages; i++) {
      setTimeout(() => {
        setCurrentPage(i);
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          
          const link = document.createElement('a');
          link.download = `frames-page-${i + 1}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }, 500);
      }, i * 600);
    }
  };

  const handleDownloadPDF = async () => {
    const pdf = new jsPDF({
      orientation: config.orientation,
      unit: 'mm',
      format: [config.width, config.height]
    });

    for (let i = 0; i < totalPages; i++) {
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) continue;

      const dpi = 2;
      const mmToPixel = 3.7795275591;
      const scale = dpi;
      
      tempCanvas.width = config.width * mmToPixel * scale;
      tempCanvas.height = config.height * mmToPixel * scale;

      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      if (config.showRegistrationMarks) {
        drawRegistrationMarks(ctx, config.width * mmToPixel, config.height * mmToPixel);
      }

      const marginPx = config.margin * mmToPixel;
      const spacingPx = config.spacing * mmToPixel;
      const availableWidth = (config.width * mmToPixel) - (2 * marginPx);
      const availableHeight = (config.height * mmToPixel) - (2 * marginPx);
      
      const frameWidth = (availableWidth - (config.gridCols - 1) * spacingPx) / config.gridCols;
      const frameHeight = (availableHeight - (config.gridRows - 1) * spacingPx) / config.gridRows;

      const startIdx = i * framesPerPage;
      const endIdx = Math.min(startIdx + framesPerPage, frames.length);
      const pageFrames = frames.slice(startIdx, endIdx);

      pageFrames.forEach((frame, idx) => {
        const row = Math.floor(idx / config.gridCols);
        const col = idx % config.gridCols;
        const x = marginPx + col * (frameWidth + spacingPx);
        const y = marginPx + row * (frameHeight + spacingPx);

        if (config.showCutGuides) {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x, y, frameWidth, frameHeight);
          ctx.setLineDash([]);
        }

        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, frameWidth, frameHeight);

        const img = loadedImages.get(frame.id);
        if (img) {
          drawFrameImage(ctx, img, x, y, frameWidth, frameHeight, config);
        }

        if (config.showFrameNumbers) {
          drawFrameNumber(ctx, startIdx + idx + 1, x, y, frameWidth, frameHeight, config.frameNumberPosition, config.showTimecodes);
        }

        if (config.showTimecodes) {
          drawTimecode(ctx, formatTimecode(frame.timestamp), x, y, frameWidth, frameHeight, config.showFrameNumbers, config.frameNumberPosition);
        }
      });

      const imgData = tempCanvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, config.width, config.height);
      if (i < totalPages - 1) {
        pdf.addPage();
      }
    }

    pdf.save('frames.pdf');
  };

  useImperativeHandle(ref, () => ({
    print: handlePrint,
    downloadPage: handleDownload,
    downloadAllPages: handleDownloadAll,
    downloadPDF: handleDownloadPDF,
    getPreviewData: () => ({
      totalFrames: frames.length,
      totalPages: totalPages,
      framesPerPage: framesPerPage,
      currentPage: currentPage
    })
  }));

  return (
    <div className="space-y-4">
      {/* Canvas Preview */}
      <div 
        className="p-4 sm:p-8 rounded-lg overflow-auto"
        style={{ 
          backgroundColor: 'var(--muted)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div className="mx-auto" style={{ 
          width: 'fit-content',
          maxWidth: '100%',
          boxShadow: 'var(--elevation-sm)',
          position: 'relative',
        }}>
          {showRulers ? (
            <Ruler width={config.width} height={config.height} unit={rulerUnit}>
              <canvas
                ref={canvasRef}
                style={{ 
                  backgroundColor: 'var(--card)',
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </Ruler>
          ) : (
            <canvas
              ref={canvasRef}
              style={{ 
                backgroundColor: 'var(--card)',
                display: 'block',
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          )}
        </div>
      </div>

      {/* Page Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="size-4 mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <span className="small" style={{ color: 'var(--muted-foreground)' }}>
            Page {currentPage + 1} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
});