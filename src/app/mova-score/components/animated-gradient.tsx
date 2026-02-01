import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export function AnimatedGradient() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Primary gradient orb - warm sepia tones */}
      <motion.div
        animate={{
          x: [0, 150, -100, 0],
          y: [0, -80, 60, 0],
          scale: [1, 1.3, 0.9, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '-15%',
          left: '-5%',
          width: '70%',
          height: '70%',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(53, 56, 57, 0.20) 0%, rgba(53, 56, 57, 0.10) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(192, 201, 204, 0.25) 0%, rgba(155, 162, 165, 0.15) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Secondary gradient orb - complementary primary tones */}
      <motion.div
        animate={{
          x: [0, -120, 90, 0],
          y: [0, 120, -70, 0],
          scale: [1, 1.4, 0.95, 1],
          rotate: [0, 90, 180, 360],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-5%',
          width: '65%',
          height: '65%',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(85, 89, 91, 0.18) 0%, rgba(53, 56, 57, 0.10) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(155, 162, 165, 0.22) 0%, rgba(119, 125, 127, 0.12) 40%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />

      {/* Tertiary gradient orb - lighter primary variations */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -100, 80, 0],
          scale: [1, 1.2, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 6,
        }}
        style={{
          position: 'absolute',
          top: '35%',
          right: '15%',
          width: '55%',
          height: '55%',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(119, 125, 127, 0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(238, 240, 241, 0.35) 0%, rgba(192, 201, 204, 0.15) 50%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Accent orb - subtle movement for depth */}
      <motion.div
        animate={{
          x: [0, -50, 70, 0],
          y: [0, 90, -50, 0],
          scale: [1, 1.15, 1.05, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 8,
        }}
        style={{
          position: 'absolute',
          top: '60%',
          left: '30%',
          width: '45%',
          height: '45%',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(85, 89, 91, 0.10) 0%, transparent 65%)'
            : 'radial-gradient(circle, rgba(243, 244, 245, 0.30) 0%, rgba(155, 162, 165, 0.10) 50%, transparent 70%)',
          filter: 'blur(85px)',
        }}
      />
    </div>
  );
}
