"use client";

import { ArrowRight, Check, FileText, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";

/** The answer, on its own page rather than stapled under the problem. Two
 * arguments sitting on one scroll meant the second one was read as a footnote
 * to the first, when it is the whole point of the build. */
export function PrototypeAnswer() {
  return (
    <AppShell>
      <main
        id="main"
        className="flex w-full flex-col px-[5vw] py-16 text-[var(--om-text)]"
      >
        <section className="flex w-full flex-col gap-8">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[var(--om-accent)]">
              The answer
            </p>
            <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.8rem)] font-extrabold leading-[1.14] text-[var(--om-text)]">
              Don&apos;t make the AI smarter.{" "}
              <span className="text-[var(--om-accent)]">Give it a memory.</span>
            </h2>
            <p className="mt-4 text-[clamp(1rem,1.35vw,1.3rem)] leading-relaxed text-[var(--om-muted)]">
              A reviewer is already fixing the bad matches. That correction is the most valuable
              thing in the system and it was being thrown away. So every decision is now logged
              against the customer who made it, and an agent distills that log into a short brief
              the matcher reads on every future order.
            </p>
          </div>

          {/* The cost argument, which is the part that makes it engineering and
              not just a nice idea. */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-[var(--om-border-strong)] bg-[var(--om-surface)] p-6">
              <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--om-muted)]">
                <X className="size-3.5" />
                The obvious way
              </p>
              <p className="mt-3 text-base font-bold text-[var(--om-text)]">
                Put every past correction in the prompt.
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--om-muted)]">
                Works for three corrections. A customer with three hundred means three hundred
                examples in every prompt, forever. The better you know them, the more they cost you.
                The memory becomes the bill.
              </p>
              <p className="mt-4 font-mono text-sm font-bold text-amber-700">cost grows with trust</p>
            </div>

            <div className="rounded-xl border border-[var(--om-accent)] bg-[var(--om-accent-softer)] p-6">
              <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--om-accent)]">
                <Check className="size-3.5" />
                What I built
              </p>
              <p className="mt-3 text-base font-bold text-[var(--om-text)]">
                An agent keeps one short file per customer.
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--om-muted)]">
                It reads the whole correction log and writes down the rule behind it, not the list.
                Rewritten each time, never appended to. Deciding what is worth keeping is the
                agent&apos;s actual job, and it is the same job you do when you write a good brief
                for a colleague.
              </p>
              <p className="mt-4 font-mono text-sm font-bold text-[var(--om-accent)]">
                cost stays flat forever
              </p>
            </div>
          </div>

          {/* Show the file. Claiming an agent writes a good brief is cheap;
              printing the one it actually wrote is not. */}
          <div className="overflow-hidden rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)]">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--om-border)] bg-[var(--om-surface-2)] px-4 py-2.5">
              <span className="flex items-center gap-2">
                <FileText className="size-3.5 text-[var(--om-accent)]" />
                <span className="font-mono text-[11px] font-semibold text-[var(--om-text)]">
                  vogt-hydraulik-gmbh/context.md
                </span>
              </span>
              <span className="font-mono text-[10px] text-[var(--om-subtle)]">
                written by the agent from 1 correction · ~150 tokens
              </span>
            </header>
            <div className="flex flex-col gap-4 p-5">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--om-accent)]">
                  What they mean
                </p>
                <p className="mt-1 text-[clamp(0.95rem,1.15vw,1.15rem)] leading-7 text-[var(--om-muted)]">
                  &ldquo;inox&rdquo; on fasteners resolves to{" "}
                  <strong className="font-semibold text-[var(--om-text)]">A4 stainless</strong>, not
                  A2.
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--om-accent)]">
                  Never
                </p>
                <p className="mt-1 text-[clamp(0.95rem,1.15vw,1.15rem)] leading-7 text-[var(--om-muted)]">
                  Never default their inox fasteners to A2. The reviewer replaced that SKU once
                  already.
                </p>
              </div>
            </div>
            <footer className="border-t border-[var(--om-border)] bg-[var(--om-surface-2)] px-4 py-2.5 text-xs text-[var(--om-muted)]">
              A real file, written by a real model call from one real correction. Not a mockup.
            </footer>
          </div>

          <p className="text-[clamp(1.05rem,1.5vw,1.5rem)] font-bold leading-snug text-[var(--om-text)]">
            It learned the rule, not the example. That is the difference between a log and a memory.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-[var(--om-accent)] px-6 text-sm text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
            >
              <TransitionLink href="/prototype/start">
                Run an order through it
                <ArrowRight aria-hidden="true" />
              </TransitionLink>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[var(--om-border-strong)] bg-[var(--om-surface)] px-6 text-sm"
            >
              <TransitionLink href="/prototype/customers">
                See what it has learned
              </TransitionLink>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[var(--om-border-strong)] bg-[var(--om-surface)] px-6 text-sm"
            >
              <TransitionLink href="/thesis">How the whole thing works</TransitionLink>
            </Button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
