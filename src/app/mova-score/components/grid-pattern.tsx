import { useEffect, useRef } from 'react';

export function GridPattern() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get the current theme
      const isDark = document.documentElement.classList.contains('dark');
      
      // Use different colors for light/dark mode for better visibility
      let r, g, b, opacity;
      
      if (isDark) {
        // Dark mode: Use border color (charcoal gray)
        r = 55;
        g = 55;
        b = 55;
        opacity = 0.4;
      } else {
        // Light mode: Use darker color for contrast against light background
        r = 140;
        g = 135;
        b = 125;
        opacity = 0.15;
      }

      const gridSize = 80;
      const circleRadius = 2;

      // Draw grid of circles
      for (let x = gridSize; x < canvas.width; x += gridSize) {
        for (let y = gridSize; y < canvas.height; y += gridSize) {
          // Circle
          ctx.beginPath();
          ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          ctx.fill();

          // Draw dashed lines to neighboring circles
          ctx.setLineDash([2, 6]);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.5})`;
          ctx.lineWidth = 0.5;

          // Line to right
          if (x + gridSize < canvas.width) {
            ctx.beginPath();
            ctx.moveTo(x + circleRadius, y);
            ctx.lineTo(x + gridSize - circleRadius, y);
            ctx.stroke();
          }

          // Line to bottom
          if (y + gridSize < canvas.height) {
            ctx.beginPath();
            ctx.moveTo(x, y + circleRadius);
            ctx.lineTo(x, y + gridSize - circleRadius);
            ctx.stroke();
          }
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Redraw when theme changes
    const observer = new MutationObserver(() => {
      draw();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      window.removeEventListener('resize', resize);
      observer.disconnect();
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
        zIndex: 1,
      }}
    />
  );
}
