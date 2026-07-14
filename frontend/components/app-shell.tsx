"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { TransitionLink } from "@/components/view-transition-link";
import { icons } from "@/lib/icons";
import { THESIS_STEPS } from "@/lib/thesis-nav";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  showNavigation?: boolean;
};

type NavChild = { href: string; label: string };

type NavItem = {
  href: string;
  icon: (typeof icons)[keyof typeof icons];
  label: string;
  children?: NavChild[];
};

const NAV_STORAGE_KEY = "ordermatch-nav-open";

const navItems: NavItem[] = [
  { href: "/", icon: icons.pending, label: "Start" },
  {
    href: "/prototype",
    icon: icons.orderReview,
    label: "What I built",
    children: [
      { href: "/prototype", label: "Prototype" },
      { href: "/prototype/customers", label: "What it learned" },
      { href: "/prototype/orders", label: "Order log" },
      { href: "/prototype/setup", label: "Setup" },
    ],
  },
  {
    href: "/thesis",
    icon: icons.readiness,
    label: "How it works",
    children: THESIS_STEPS.map(({ step, label }) => ({
      href: step === 0 ? "/thesis" : `/thesis?step=${step}`,
      label,
    })),
  },
  { href: "/proof", icon: icons.trust, label: "Why me" },
  { href: "/contact", icon: icons.mail, label: "Next step" },
];

// When every child shares the same base path (e.g. thesis slides all live at
// /thesis), there is no way to tell which one is active from the pathname
// alone, so skip the per-child highlight rather than guessing wrong.
function getActiveChildHref(children: NavChild[] | undefined, pathname: string) {
  if (!children) {
    return null;
  }

  const basePaths = new Set(children.map((child) => child.href.split("?")[0]));
  if (basePaths.size <= 1) {
    return null;
  }

  let bestHref: string | null = null;
  let bestLength = -1;

  for (const child of children) {
    const basePath = child.href.split("?")[0];
    const matches = pathname === basePath || pathname.startsWith(`${basePath}/`);
    if (matches && basePath.length > bestLength) {
      bestLength = basePath.length;
      bestHref = child.href;
    }
  }

  return bestHref;
}

function syncNavOpenAttribute(isOpen: boolean) {
  document.documentElement.dataset.navOpen = isOpen ? "true" : "false";
  localStorage.setItem(NAV_STORAGE_KEY, String(isOpen));
}

export function AppShell({
  children,
  className,
  showNavigation = true,
}: AppShellProps) {
  const [isNavOpen, setIsNavOpen] = useState(true);
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const PanelIcon = isNavOpen ? icons.panelClose : icons.panelOpen;

  useEffect(() => {
    const documentNavOpen =
      document.documentElement.dataset.navOpen === "true";

    setIsNavOpen(documentNavOpen);
    syncNavOpenAttribute(documentNavOpen);
  }, []);

  useEffect(() => {
    if (!showNavigation || !isNavOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        syncNavOpenAttribute(false);
        setIsNavOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNavOpen, showNavigation]);

  return (
    <div
      data-nav-open={isNavOpen ? "true" : "false"}
      className={cn(
        "min-h-dvh bg-[var(--om-bg)] text-[var(--om-text)]",
        showNavigation ? "app-shell-with-nav" : undefined,
        className,
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-[var(--om-text)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--om-bg)]"
      >
        Skip to main content
      </a>

      {showNavigation ? (
        <aside
          ref={navRef}
          aria-label="Primary navigation"
          className={cn(
            "nav-rail fixed inset-y-0 left-0 z-50 hidden border-r border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-text)] transition-[width] duration-200 ease-out md:block motion-reduce:transition-none",
            isNavOpen ? "w-72" : "w-20",
          )}
        >
          <div className="flex h-full flex-col overflow-hidden px-4 py-6">
            <TransitionLink
              href="/"
              aria-label="OrderMatch Lab home"
              className="flex h-12 items-center gap-4 rounded-full text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
            >
              <span className="flex size-12 shrink-0 items-center justify-center">
                <BrandMark className="size-12" />
              </span>
              <span
                className={cn(
                  "nav-rail-label flex min-w-0 flex-col whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none",
                  isNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <span className="text-sm font-bold leading-5 text-[var(--om-text)]">
                  OrderMatch Lab
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--om-muted)]">
                  Building Radar prototype
                </span>
              </span>
            </TransitionLink>

            <nav
              aria-label="Primary"
              className="flex flex-1 flex-col justify-center gap-3"
            >
              <button
                type="button"
                aria-expanded={isNavOpen}
                aria-label={isNavOpen ? "Collapse sidebar" : "Expand sidebar"}
                onClick={() =>
                  setIsNavOpen((current) => {
                    const next = !current;
                    syncNavOpenAttribute(next);
                    return next;
                  })
                }
                className="relative flex h-12 items-center gap-4 rounded-xl text-sm font-medium text-[var(--om-muted)] outline-none transition-colors duration-150 hover:bg-[var(--om-surface-2)] hover:text-[var(--om-text)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl">
                  <PanelIcon aria-hidden="true" className="size-5" />
                </span>
                <span
                  className={cn(
                    "nav-rail-label whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none",
                    isNavOpen
                      ? "opacity-100"
                      : "pointer-events-none opacity-0",
                  )}
                >
                  {isNavOpen ? "Collapse" : "Expand"}
                </span>
              </button>

              <p
                className={cn(
                  "nav-rail-label whitespace-nowrap pl-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--om-subtle)] transition-opacity duration-150 motion-reduce:transition-none",
                  isNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                Menu
              </p>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const NavIcon = item.icon;
                const activeChildHref = getActiveChildHref(item.children, pathname);
                const showChildren =
                  isNavOpen && isActive && item.children && item.children.length > 0;

                return (
                  <div key={item.href}>
                    <TransitionLink
                      href={item.href}
                      className={cn(
                        "relative flex h-12 items-center gap-4 rounded-xl text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]",
                        isActive
                          ? "text-[var(--om-text)]"
                          : "text-[var(--om-muted)] hover:text-[var(--om-text)]",
                      )}
                    >
                      {isActive ? (
                        <span className="absolute left-[-16px] h-8 w-1 rounded-r-full bg-[var(--om-accent)]" />
                      ) : null}
                      <span
                        className={cn(
                          "flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-150",
                          isActive
                            ? "bg-[var(--om-accent-soft)] text-[var(--om-accent)]"
                            : "text-[var(--om-muted)] hover:bg-[var(--om-surface-2)] hover:text-[var(--om-text)]",
                        )}
                      >
                        <NavIcon aria-hidden="true" className="size-5" />
                      </span>
                      <span
                        className={cn(
                          "nav-rail-label whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none",
                          isNavOpen
                            ? "opacity-100"
                            : "pointer-events-none opacity-0",
                        )}
                      >
                        {item.label}
                      </span>
                    </TransitionLink>

                    {showChildren ? (
                      <div className="ml-[1.6rem] mt-1 flex flex-col gap-0.5 border-l border-[var(--om-border)] pl-4">
                        {item.children!.map((child) => {
                          const isChildActive = activeChildHref === child.href;

                          return (
                            <TransitionLink
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "nav-rail-label rounded-md py-1.5 text-xs font-medium transition-colors duration-150",
                                isChildActive
                                  ? "text-[var(--om-accent)]"
                                  : "text-[var(--om-muted)] hover:text-[var(--om-text)]",
                              )}
                            >
                              {child.label}
                            </TransitionLink>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>

            <div className="flex h-12 items-center gap-4 rounded-xl text-sm font-semibold text-[var(--om-muted)]">
              <ThemeToggle className="size-12 shrink-0 rounded-xl bg-[var(--om-surface-2)] text-[var(--om-accent)]" />
              <span
                className={cn(
                  "nav-rail-label whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none",
                  isNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                Theme
              </span>
            </div>
          </div>
        </aside>
      ) : null}

      {showNavigation ? (
        <header className="sticky top-0 z-40 border-b border-[var(--om-border)] bg-[var(--om-surface)]/95 px-4 py-3 text-[var(--om-text)] backdrop-blur md:hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl text-sm font-semibold marker:hidden">
              <span className="flex items-center gap-2">
                <BrandMark className="size-6 shrink-0" />
                OrderMatch Lab
              </span>
              <span className="flex items-center gap-2">
                <ThemeToggle className="size-9" />
                <span className="rounded-full border border-[var(--om-border)] px-3 py-1 text-xs text-[var(--om-muted)]">
                  Menu
                </span>
              </span>
            </summary>
            <nav aria-label="Mobile primary" className="mt-3 grid gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const activeChildHref = getActiveChildHref(item.children, pathname);
                const showChildren = isActive && item.children && item.children.length > 0;

                return (
                  <div key={item.href}>
                    <TransitionLink
                      href={item.href}
                      className={cn(
                        "block rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--om-surface-2)] hover:text-[var(--om-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]",
                        isActive
                          ? "bg-[var(--om-accent-soft)] text-[var(--om-text)]"
                          : "text-[var(--om-muted)]",
                      )}
                    >
                      {item.label}
                    </TransitionLink>

                    {showChildren ? (
                      <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--om-border)] pl-3">
                        {item.children!.map((child) => {
                          const isChildActive = activeChildHref === child.href;

                          return (
                            <TransitionLink
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                                isChildActive
                                  ? "text-[var(--om-accent)]"
                                  : "text-[var(--om-muted)] hover:text-[var(--om-text)]",
                              )}
                            >
                              {child.label}
                            </TransitionLink>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </details>
        </header>
      ) : null}

      <div
        className={
          showNavigation ? "nav-content motion-reduce:transition-none" : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
