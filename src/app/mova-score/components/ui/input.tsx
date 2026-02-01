import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70",
        "placeholder:text-white/30",
        "focus-visible:border-white/30 focus-visible:ring-white/20 focus-visible:ring-[3px] outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "transition-[color,box-shadow]",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white/70",
        "selection:bg-white/20 selection:text-white",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
