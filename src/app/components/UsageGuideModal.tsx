"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";

export interface UsageGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Optional footer (e.g. slide nav + progress). When omitted, no footer is shown. */
  footer?: React.ReactNode;
}

const contentClassName =
  "max-w-[600px] max-h-[90vh] flex flex-col bg-black/95 border border-white/10 rounded-lg [&>.absolute]:text-white [&>.absolute]:opacity-90 [&>.absolute]:hover:opacity-100 [&>.absolute]:right-4 [&>.absolute]:top-4";

export function UsageGuideModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: UsageGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle className="text-white/90">{title}</DialogTitle>
          {description != null && (
            <DialogDescription className="text-white/60">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-0 space-y-4">
          {children}
        </div>

        {footer != null && (
          <DialogFooter className="flex-shrink-0 border-t border-white/10 pt-4 mt-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
