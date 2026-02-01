import { motion, AnimatePresence } from 'motion/react';
import { X, Info } from 'lucide-react';
import { ReactNode, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ResponsiveInfoPopoverProps {
  content: ReactNode;
  side?: 'left' | 'right'; // Which side the tooltip should appear on
}

export function ResponsiveInfoPopover({ content, side = 'left' }: ResponsiveInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tooltip = (
    <AnimatePresence>
      {/* Mobile: Centered modal */}
      {isOpen && isMobile && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setIsOpen(false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md max-h-[80vh] overflow-y-auto bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[70] p-6"
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
            
            <div className="pr-8">
              {content}
            </div>
          </motion.div>
        </>
      )}
      
      {/* Desktop: Tooltip centered vertically to right of panel */}
      {isHovering && !isMobile && (
        <motion.div
          initial={{ opacity: 0, x: side === 'right' ? 10 : -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: side === 'right' ? 10 : -10 }}
          transition={{ duration: 0.15 }}
          className={`fixed top-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-430px)] bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999] p-5 pointer-events-none ${
            side === 'right' 
              ? 'right-[330px] md:right-[410px]' 
              : 'left-[410px]'
          }`}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="relative inline-block">
        <button
          onClick={() => isMobile && setIsOpen(!isOpen)}
          onMouseEnter={() => !isMobile && setIsHovering(true)}
          onMouseLeave={() => !isMobile && setIsHovering(false)}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors group min-h-[20px] text-[10px] md:text-[11px]"
        >
          <Info size={12} className="group-hover:text-white/80 flex-shrink-0 md:w-3 md:h-3" />
          <span className="whitespace-nowrap">View control details</span>
        </button>
      </div>
      
      {/* Render tooltip via portal to document.body */}
      {typeof document !== 'undefined' && createPortal(tooltip, document.body)}
    </>
  );
}