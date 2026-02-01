import { useEffect, useRef } from 'react';

interface FilmGrainLayerProps {
  intensity: number; // 0 to 1
  animationSpeed: number; // frames between noise regeneration (1 = every frame, 3 = every 3 frames, etc.)
  children: React.ReactNode;
}

export function FilmGrainLayer({ intensity, animationSpeed, children }: FilmGrainLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const noiseImageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // If intensity is too low, just clear and stop rendering
    if (intensity < 0.001) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }

    const ctx = canvas.getContext('2d', { 
      alpha: true,
      willReadFrequently: false 
    });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Regenerate noise texture when size changes
      noiseImageDataRef.current = null;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate noise texture (regenerate occasionally for animation)
    const generateNoise = () => {
      const w = canvas.width;
      const h = canvas.height;
      
      // Validate canvas dimensions before creating ImageData
      if (w <= 0 || h <= 0 || !isFinite(w) || !isFinite(h)) {
        return null;
      }
      
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Random grayscale value
        const noise = Math.random() * 255;
        data[i] = noise;     // R
        data[i + 1] = noise; // G
        data[i + 2] = noise; // B
        data[i + 3] = 255; // Full alpha - opacity controlled by canvas style
      }

      return imageData;
    };

    let frameCount = 0;
    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      
      // Skip rendering if canvas dimensions are invalid
      if (w <= 0 || h <= 0 || !isFinite(w) || !isFinite(h)) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // Regenerate noise every 3 frames for animated grain
      if (!noiseImageDataRef.current || frameCount % animationSpeed === 0) {
        noiseImageDataRef.current = generateNoise();
      }
      frameCount++;

      // Draw the noise texture
      if (noiseImageDataRef.current) {
        ctx.putImageData(noiseImageDataRef.current, 0, 0);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resize);
    };
  }, [intensity, animationSpeed]);

  return (
    <>
      {children}
      {intensity >= 0.001 && (
        <canvas
          ref={canvasRef}
          className="film-grain-canvas fixed inset-0 w-full h-full pointer-events-none z-[20]"
          style={{ mixBlendMode: 'overlay', opacity: Math.min(1, intensity * 5) }}
        />
      )}
    </>
  );
}