"use client";

import { useEffect, useState } from "react";

import { icons } from "@/lib/icons";
import { cn } from "@/lib/utils";

const THEME_STORAGE_KEY = "ordermatch-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const Moon = icons.moon;
  const Sun = icons.sun;
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme =
      localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";

    setTheme(storedTheme);
    document.documentElement.dataset.theme = storedTheme;
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextTheme} theme`}
      onClick={(event) => {
        event.stopPropagation();
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full border border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-muted)] outline-none transition-colors duration-150 hover:border-[var(--om-border-strong)] hover:bg-[var(--om-surface-2)] hover:text-[var(--om-text)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}
