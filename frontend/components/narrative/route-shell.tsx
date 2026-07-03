import type { ReactNode } from "react";

import { TransitionLink } from "@/components/view-transition-link";
import { icons } from "@/lib/icons";

type RouteShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  items: string[];
  children?: ReactNode;
};

export function RouteShell({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  items,
  children,
}: RouteShellProps) {
  const ArrowRight = icons.action;

  return (
    <main
      id="main"
      className="relative mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col overflow-hidden px-5 py-10 text-[var(--om-text)] sm:px-8 lg:px-12"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_440px_at_62%_22%,rgba(var(--om-accent-rgb),0.12),transparent_62%),var(--om-bg)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(var(--om-accent-rgb),0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--om-accent-rgb),0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(760px_520px_at_56%_25%,#000_0%,transparent_78%)]" />

      <section className="grid flex-1 gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--om-border)] bg-[var(--om-surface)]/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--om-muted)]">
            <span className="size-1.5 rounded-full bg-[var(--om-accent)]" />
            V0 preview
          </div>
          <p className="text-sm font-semibold text-[var(--om-accent)]">{eyebrow}</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-normal text-[var(--om-text)] sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--om-muted)]">
            {description}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <TransitionLink
              href={primaryHref}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--om-accent)] px-5 py-3 text-sm font-extrabold text-[var(--om-accent-text)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--om-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--om-bg)] sm:w-auto motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {primaryLabel}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </TransitionLink>
            <TransitionLink
              href="/"
              className="inline-flex w-full items-center justify-center rounded-full border border-[var(--om-border)] bg-[var(--om-surface)]/80 px-5 py-3 text-sm font-semibold text-[var(--om-muted)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--om-border-strong)] hover:text-[var(--om-text)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)] sm:w-auto motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Back to start
            </TransitionLink>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--om-border)] bg-[var(--om-surface)]/82 p-4 sm:p-5">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--om-muted)]">
            Plain English version
          </p>
          <ol className="relative mt-6 grid gap-6 pl-8">
            <span
              aria-hidden="true"
              className="absolute bottom-3 left-[0.4375rem] top-3 w-px bg-[var(--om-border)]"
            />
            {items.map((item, index) => (
              <li
                key={item}
                className="relative text-sm leading-6 text-[var(--om-muted)]"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-8 top-2 flex size-3.5 items-center justify-center rounded-full border border-[var(--om-accent)] bg-[var(--om-surface)]"
                >
                  <span className="size-1.5 rounded-full bg-[var(--om-accent)]" />
                </span>
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--om-subtle)]">
                  Step {index + 1}
                </span>
                <span className="text-[var(--om-text)]">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      {children ? <div className="pb-10">{children}</div> : null}
    </main>
  );
}
