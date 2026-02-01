import { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, MoreVertical, Film, Sparkles, Music } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenInstructions: () => void;
  children: ReactNode;
  footer?: ReactNode;
  appMode?: 'mova-parque' | 'video-to-frames' | 'mova-score';
  onAppModeChange?: (mode: 'mova-parque' | 'video-to-frames' | 'mova-score') => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  onOpenInstructions,
  children,
  footer,
  appMode,
  onAppModeChange,
}: SidebarProps) {
  return (
    <>
      {/* Sidebar Panel */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed left-0 top-0 bottom-0 w-full max-w-[400px] bg-black/40 backdrop-blur-xl border-r border-white/10 overflow-y-auto control-panel-scroll z-50 lg:w-[400px]"
          >
            <div className="p-4 md:p-8 space-y-5">
              {/* Header with toggle button */}
              <div className="space-y-2 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-md font-thin tracking-wider text-white/60 uppercase">
                      Video to Frames
                    </h1>
                    <p className="text-xs text-white/40 leading-relaxed mt-0">
                      For stop-motion creation and beyond.{" "}
                      <button
                        onClick={onOpenInstructions}
                        className="text-[12px] font-thin text-white/60 hover:text-white underline underline-offset-2 decoration-white/30 hover:decoration-white/60 transition-all"
                      >
                        read our usage guide
                      </button>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* App Menu */}
                    {appMode !== undefined && onAppModeChange && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all flex-shrink-0"
                            title="Apps & Settings"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end" 
                          className="w-56 bg-black/90 backdrop-blur-xl border border-white/10"
                        >
                          <DropdownMenuLabel className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px]">
                            Apps
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onAppModeChange('mova-parque')}
                            className={`text-white/70 focus:text-white focus:bg-white/10 ${
                              appMode === 'mova-parque' ? 'bg-white/5' : ''
                            }`}
                          >
                            <Sparkles className="size-4 mr-2" />
                            <span>Mova Parque</span>
                            {appMode === 'mova-parque' && (
                              <span className="ml-auto text-xs text-white/40">✓</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onAppModeChange('video-to-frames')}
                            className={`text-white/70 focus:text-white focus:bg-white/10 ${
                              appMode === 'video-to-frames' ? 'bg-white/5' : ''
                            }`}
                          >
                            <Film className="size-4 mr-2" />
                            <span>Video to Frames</span>
                            {appMode === 'video-to-frames' && (
                              <span className="ml-auto text-xs text-white/40">✓</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onAppModeChange('mova-score')}
                            className={`text-white/70 focus:text-white focus:bg-white/10 ${
                              appMode === 'mova-score' ? 'bg-white/5' : ''
                            }`}
                          >
                            <Music className="size-4 mr-2" />
                            <span>Motion Scores</span>
                            {appMode === 'mova-score' && (
                              <span className="ml-auto text-xs text-white/40">✓</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuLabel className="text-xs font-normal tracking-wider text-white/60 uppercase text-[11px]">
                            Account
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled
                            className="text-white/40 cursor-not-allowed"
                          >
                            <span className="text-xs">Coming soon</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {/* Close button */}
                    <button
                      onClick={onToggle}
                      className="bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all flex-shrink-0"
                      title="Close panel"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              {children}

              {/* Footer */}
              {footer && (
                <div className="pt-5 border-t border-white/10">
                  {footer}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="lg:hidden"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 40,
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}