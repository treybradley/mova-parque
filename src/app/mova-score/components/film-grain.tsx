import { useEffect, useRef } from 'react';

export function FilmGrain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full screen
    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Only update if dimensions are valid
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Film grain animation
    let animationId: number;
    const animate = () => {
      // Skip if canvas has no size
      if (canvas.width === 0 || canvas.height === 0) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(imageData.data.buffer);
      const len = buffer32.length;

      for (let i = 0; i < len; i++) {
        // Create sparse grain (only ~1.5% of pixels for subtle effect)
        if (Math.random() < 0.015) {
          const value = Math.random() * 30; // Very low intensity grain
          buffer32[i] = 
            (Math.floor(value) << 24) | // alpha
            (255 << 16) |                // blue
            (255 << 8) |                 // green
            255;                         // red
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.05,
        zIndex: 1,
        mixBlendMode: 'overlay',
      }}
    />
  );
}
