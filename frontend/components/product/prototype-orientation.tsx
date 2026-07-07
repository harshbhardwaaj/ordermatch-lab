"use client";

import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";

export function PrototypeOrientation() {
  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col items-center justify-center px-4 py-12 text-[var(--om-text)] sm:px-6 lg:px-8"
      >
        <section className="mx-auto flex w-full max-w-4xl flex-col items-start gap-7 text-left">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[var(--om-accent)] sm:text-sm">
            The problem, in plain words
          </p>

          <div className="max-w-3xl space-y-4 pt-2">
            <h1 className="text-2xl font-extrabold leading-tight tracking-normal text-[var(--om-text)] sm:text-3xl lg:text-[2.15rem]">
              Every day, someone opens an email that says
            </h1>

            <p className="text-[1.4rem] font-extrabold leading-tight tracking-normal text-[var(--om-accent)] sm:text-[1.75rem] lg:text-[2rem]">
              send 50 of the M8 bearings we ordered last time, same as PO 4471,
              deliver to the Hamburg site
            </p>

            <p className="text-2xl font-extrabold leading-tight tracking-normal text-[var(--om-text)] sm:text-3xl lg:text-[2.15rem]">
              and has to figure out what that actually means.
            </p>
          </div>

          <p className="max-w-2xl text-base leading-7 text-[var(--om-muted)] sm:text-lg">
            Which exact bearing? Which Hamburg address? Someone digs through past
            orders, guesses, and types it into the system by hand.
          </p>

          <Button
            asChild
            size="lg"
            className="mt-7 w-full bg-[var(--om-accent)] px-6 text-sm text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)] sm:w-auto"
          >
            <TransitionLink href="/prototype/workflow">
              See how I&apos;d solve this for Comena
              <ArrowRight aria-hidden="true" />
            </TransitionLink>
          </Button>
        </section>
      </main>
    </AppShell>
  );
}
