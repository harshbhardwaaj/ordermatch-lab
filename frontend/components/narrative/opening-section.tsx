import { TransitionLink } from "@/components/view-transition-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { brand } from "@/lib/brand";
import { icons } from "@/lib/icons";

export function OpeningSection() {
  const ArrowRight = icons.action;

  return (
    <section className="hero-motion relative min-h-dvh overflow-hidden bg-[var(--om-bg)] text-[var(--om-text)]">
      <div className="absolute inset-0 bg-[radial-gradient(1100px_560px_at_50%_42%,var(--om-bg-soft)_0%,var(--om-bg)_64%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--om-accent-rgb),0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--om-accent-rgb),0.055)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(820px_480px_at_50%_44%,#000_0%,transparent_78%)]" />
      <div className="absolute right-5 top-5 z-20 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-screen-xl items-center justify-center px-5 py-12 text-center sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          {/* Authorship first, and unmissable: this is Harsh's prototype. On an
              addressed build the client's mark appears directly below, as the
              addressee, never as the byline. On the public build there is no
              addressee, so there is no logo to show and nothing to imply. */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--om-muted)] sm:text-xs">
              <span className="size-1.5 rounded-full bg-[var(--om-accent)]" />
              {brand.hero.eyebrow}
            </p>
            {brand.addresseeLogo ? (
              <span className="rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-[var(--om-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.addresseeLogo}
                  alt={brand.addressee ?? ""}
                  className="h-5 w-auto sm:h-6"
                />
              </span>
            ) : null}
          </div>

          <h1 className="w-full text-[clamp(1.1rem,2.7vw,2.45rem)] font-extrabold leading-[1.14] tracking-normal text-[var(--om-text)]">
            <span className="block">{brand.hero.headlineTop}</span>
            {brand.hero.headlineMid ? (
              <span className="mt-3 block">{brand.hero.headlineMid}</span>
            ) : null}
            <span className="mt-3 block">
              {brand.hero.headlineLead}
              <span className="text-[var(--om-accent)]">
                {brand.hero.headlineAccent}
              </span>
              {brand.hero.headlineTail}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-balance text-base leading-relaxed text-[var(--om-muted)] sm:text-lg">
            {brand.hero.subtitle}
          </p>

          <div className="relative mt-10 inline-flex items-center justify-center sm:mt-14">
            <div className="absolute -inset-x-8 -inset-y-5 rounded-full bg-[radial-gradient(closest-side,rgba(var(--om-accent-rgb),0.28),transparent)] blur-xl [animation:hero-halo_2.8s_ease-in-out_infinite]" />
            <TransitionLink
              href="/prototype"
              className="group relative inline-flex items-center gap-3 rounded-full bg-[var(--om-accent)] px-9 py-4 text-lg font-extrabold text-[var(--om-accent-text)] outline-none transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:bg-[var(--om-accent-hover)] active:translate-y-0 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--om-bg)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
            >
              Teach it yourself
              <ArrowRight
                aria-hidden="true"
                className="size-5 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </TransitionLink>
          </div>

          <div className="mt-7 inline-flex items-center gap-2 font-mono text-xs tracking-[0.04em] text-[var(--om-muted)]">
            <span className="size-1.5 rounded-full bg-[var(--om-success)] [animation:hero-dot_1.7s_ease-in-out_infinite]" />
            <span>Real backend. Real corrections. No signup.</span>
          </div>

          <div
            className="pointer-events-none absolute bottom-8 right-5 hidden rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)]/90 p-3 text-left backdrop-blur sm:right-8 sm:block lg:bottom-16 lg:right-14 [animation:hero-float_4.2s_ease-in-out_infinite]"
            aria-hidden="true"
          >
            <div className="mb-2 flex items-center justify-between gap-8 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--om-muted)]">
              <span>vogt hydraulik · line 10</span>
              <span className="rounded-full bg-[var(--om-accent-soft)] px-2 py-0.5 text-[var(--om-accent)]">
                learned
              </span>
            </div>
            <div className="relative h-8 min-w-64 overflow-hidden font-mono text-sm font-medium">
              <span className="absolute inset-x-0 top-1 block text-[var(--om-text)] [animation:hero-chip-swap_4s_ease-in-out_infinite]">
                hex bolt m8x40 inox
              </span>
              <span className="absolute inset-x-0 top-1 block text-[var(--om-success)] [animation:hero-chip-swap-alt_4s_ease-in-out_infinite]">
                A4, not A2. You fixed this once.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
