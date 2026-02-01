import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface AnimatedStepProps {
  children: ReactNode;
  stepNumber: number;
  delay?: number;
}

export function AnimatedStep({ children, stepNumber, delay = 0 }: AnimatedStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
