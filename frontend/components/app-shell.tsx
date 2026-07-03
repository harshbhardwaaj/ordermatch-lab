"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { TransitionLink } from "@/components/view-transition-link";
import { icons } from "@/lib/icons";
import type { WorkbenchStep } from "@/lib/product-workflow";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  showNavigation?: boolean;
  workbenchSteps?: WorkbenchStep[];
};

const NAV_STORAGE_KEY = "ordermatch-nav-open";

const navItems = [
  { href: "/", icon: icons.pending, label: "Start" },
  { href: "/prototype", icon: icons.orderReview, label: "What I built" },
  { href: "/thesis", icon: icons.readiness, label: "How it works" },
  { href: "/proof", icon: icons.trust, label: "Why me" },
  { href: "/contact", icon: icons.mail, label: "Next step" },
] as const;

function syncNavOpenAttribute(isOpen: boolean) {
  document.documentElement.dataset.navOpen = isOpen ? "true" : "false";
  localStorage.setItem(NAV_STORAGE_KEY, String(isOpen));
}

function OrderMatchMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-12"
      fill="none"
      viewBox="0 0 48 48"
    >
      <circle cx="24" cy="24" r="20" fill="var(--om-accent)" />
      <circle cx="18" cy="18" r="4" fill="var(--om-accent-text)" />
      <circle
        cx="30"
        cy="18"
        fill="var(--om-accent-text)"
        opacity="0.72"
        r="4"
      />
      <circle
        cx="18"
        cy="30"
        fill="var(--om-accent-text)"
        opacity="0.72"
        r="4"
      />
      <path
        d="M22 28 30.5 19.5"
        stroke="var(--om-bg)"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="m27 29.5 3.4 3.2L37 25"
        stroke="var(--om-accent-text)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function getStepDotClass(status: WorkbenchStep["status"]) {
  if (status === "current") {
    return "border-[var(--om-accent)] bg-[var(--om-accent)]";
  }

  if (status === "done") {
    return "border-green-500 bg-green-500";
  }

  if (status === "blocked") {
    return "border-red-500 bg-red-500";
  }

  return "border-[var(--om-border-strong)] bg-[var(--om-surface)]";
}

function WorkbenchRailStepper({
  steps,
  isNavOpen,
}: {
  steps: WorkbenchStep[];
  isNavOpen: boolean;
}) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Order review steps"
      className={cn(
        "relative grid gap-0 border-l border-[var(--om-border)]",
        isNavOpen ? "ml-6 mr-1 pl-5" : "ml-6 pl-0",
      )}
    >
      {steps.map((step) => (
        <TransitionLink
          key={step.id}
          href={step.href}
          aria-current={step.status === "current" ? "step" : undefined}
          className={cn(
            "group relative flex min-h-9 items-center rounded-lg py-1.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]",
            isNavOpen ? "gap-3 px-2 hover:bg-[var(--om-surface-2)]" : "justify-center px-0",
          )}
        >
          <span
            className={cn(
              "absolute size-2.5 rounded-full border-2 transition-transform group-hover:scale-110",
              isNavOpen ? "-left-[1.375rem]" : "-left-[0.3125rem]",
              getStepDotClass(step.status),
            )}
          />
          <span
            className={cn(
              "nav-rail-label min-w-0 transition-opacity duration-150 motion-reduce:transition-none",
              isNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <span
              className={cn(
                "block truncate font-semibold",
                step.status === "current"
                  ? "text-[var(--om-accent)]"
                  : "text-[var(--om-muted)]",
              )}
            >
              {step.label}
            </span>
            <span className="block truncate text-[10px] leading-4 text-[var(--om-subtle)]">
              {step.status === "blocked" ? "Needs attention" : step.description}
            </span>
          </span>
        </TransitionLink>
      ))}
    </div>
  );
}

export function AppShell({
  children,
  className,
  showNavigation = true,
  workbenchSteps = [],
}: AppShellProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
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

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && navRef.current?.contains(target)) {
        return;
      }

      syncNavOpenAttribute(false);
      setIsNavOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        syncNavOpenAttribute(false);
        setIsNavOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNavOpen, showNavigation]);

  return (
    <div
      data-nav-open={isNavOpen ? "true" : "false"}
      className={cn(
        "min-h-screen bg-[var(--om-bg)] text-[var(--om-text)]",
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
                <OrderMatchMark />
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
                  Comena prototype
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
                    {item.href === "/prototype" && workbenchSteps.length > 0 ? (
                      <WorkbenchRailStepper
                        steps={workbenchSteps}
                        isNavOpen={isNavOpen}
                      />
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
              <span>OrderMatch Lab</span>
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

                return (
                  <TransitionLink
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--om-surface-2)] hover:text-[var(--om-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]",
                      isActive
                        ? "bg-[var(--om-accent-soft)] text-[var(--om-text)]"
                        : "text-[var(--om-muted)]",
                    )}
                  >
                    {item.label}
                  </TransitionLink>
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
