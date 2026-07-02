import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-sm font-semibold text-foreground">
            OrderMatch Lab
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
