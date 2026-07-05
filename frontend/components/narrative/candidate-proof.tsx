"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ExternalLink, Github } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import { cn } from "@/lib/utils";

type ProofLink =
  | { state: "live"; label: string; href: string; icon?: "external" | "github" }
  | { state: "unavailable"; note: string }
  | { state: "none"; note: string };

type ProofCard = {
  id: string;
  kind: string;
  title: string;
  tagline: string;
  capability: string;
  points: string[];
  mapping: string;
  links?: ProofLink[];
};

const CARDS: ProofCard[] = [
  {
    id: "alevor",
    kind: "Work project",
    title: "AI Classification System",
    tagline: "Built at ALEVOR Mittelstandspartner, classifying 380,000 companies with no reliable industry data.",
    capability: "Classification and evaluation",
    points: [
      "Labeled 200 companies by hand as a ground-truth set for a database with no reliable industry classification.",
      "Benchmarked 13 prompt variants across multiple models, scored on accuracy, similarity, and F1.",
      "Deployed the winning prompt to classify 320,000+ companies in production.",
      "Cut manual classification time by about 30%.",
    ],
    mapping:
      "Relevant here because OrderMatch Lab's SKU matching solves the same shape of problem: turn messy real data into a structured decision, measure it, then trust only the version that earned it.",
    links: [{ state: "none", note: "Built inside ALEVOR's internal systems, no public link." }],
  },
  {
    id: "investment-analyst",
    kind: "Personal project",
    title: "AI Investment Analyst",
    tagline: "Shipped a full financial analysis tool solo, in a day.",
    capability: "Full-stack build and deploy",
    points: [
      "Enter a stock ticker, get a full investment memo in return.",
      "Memo covers trading comps, a DCF with WACC decomposition, an LBO screen, and an AI-written thesis.",
      "Every financial calculation runs in Python, not the language model.",
      "Claude is used only for the qualitative sections.",
    ],
    mapping:
      "Relevant here because Comena needs interns who can connect UI, business logic, and a real deployment, and who know which parts of a system a language model should and should not touch.",
    links: [
      { state: "live", label: "View live tool", href: "https://ai-investment-analyst-harsh.vercel.app", icon: "external" },
      { state: "live", label: "View code", href: "https://github.com/harshbhardwaaj/ai-investment-analyst", icon: "github" },
    ],
  },
  {
    id: "cv-scorer",
    kind: "Personal project",
    title: "CV-JD Fit Scorer",
    tagline: "Built a structured-extraction tool from scratch.",
    capability: "Structured output from an LLM",
    points: [
      "Scores a candidate against a job description using the Claude API.",
      "PDF text extraction feeds a structured JSON output pipeline.",
      "Built and shipped in one day, with no prior Streamlit experience.",
    ],
    mapping:
      "Relevant here because it is the same problem as OrderMatch Lab's own reading step: pull clean structured fields out of messy input, validated before anything downstream uses it.",
    links: [
      {
        state: "live",
        label: "View live tool",
        href: "https://cv-scorer-harsh.streamlit.app",
        icon: "external",
      },
    ],
  },
  {
    id: "coursework",
    kind: "Coursework",
    title: "TUM Coursework",
    tagline: "Studying the theory behind the choices in this prototype.",
    capability: "Academic grounding",
    points: [
      "Machine Learning, Causal Discovery and Experimentation.",
      "Big Data Analytics: neural networks and NLP, including the same lemmatization method used at ALEVOR.",
      "Applied Econometrics: statistical modeling and causal inference.",
      "Python for Engineering and Data Analysis, in progress, exam this semester.",
    ],
    mapping:
      "Relevant here because the methods behind this prototype, calibration, selective classification, hybrid search, evals as grouping, are not guesses. They come from the same territory as this coursework.",
  },
];

function useRevealOnScroll<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function ProofLinkRow({ links }: { links: ProofLink[] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      {links.map((link, index) => {
        if (link.state === "live") {
          const Icon = link.icon === "github" ? Github : ExternalLink;
          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--om-accent)] outline-none transition-colors hover:text-[var(--om-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
            >
              {link.label}
              <Icon aria-hidden="true" className="size-3.5" />
            </a>
          );
        }

        return (
          <p key={index} className="text-xs leading-5 text-[var(--om-subtle)]">
            {link.note}
          </p>
        );
      })}
    </div>
  );
}

function TimelineItem({ card, index }: { card: ProofCard; index: number }) {
  const { ref, inView } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div ref={ref} className="relative pl-12 pb-16 last:pb-0 sm:pl-16">
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1 flex size-8 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition-all duration-500 ease-out motion-reduce:transition-none sm:size-9",
          inView
            ? "border-[var(--om-accent)] bg-[var(--om-accent)] text-[var(--om-accent-text)]"
            : "border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-subtle)]",
        )}
      >
        {index + 1}
      </span>

      <div
        className={cn(
          "transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0",
          inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        )}
      >
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--om-subtle)]">
          {card.kind}
        </p>
        <h2 className="mt-1 text-xl font-extrabold leading-snug text-[var(--om-text)] sm:text-2xl">
          {card.title}
        </h2>
        <p className="mt-1 text-base font-medium leading-7 text-[var(--om-muted)]">
          {card.tagline}
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {card.points.map((point) => (
            <li key={point} className="flex gap-2.5 text-base leading-7 text-[var(--om-muted)]">
              <span
                aria-hidden="true"
                className="mt-2.5 size-1 shrink-0 rounded-full bg-[var(--om-accent)]"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <span className="mt-4 inline-flex w-fit items-center rounded-full border border-[var(--om-accent-soft)] bg-[var(--om-accent-soft)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--om-accent)]">
          Comena-relevant skill: {card.capability}
        </span>
        <p className="mt-3 border-l-2 border-[var(--om-accent-soft)] pl-3 text-sm leading-6 text-[var(--om-muted)]">
          {card.mapping}
        </p>
        {card.links ? <ProofLinkRow links={card.links} /> : null}
      </div>
    </div>
  );
}

export function CandidateProof() {
  return (
    <AppShell>
      <main
        id="main"
        className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-10 text-[var(--om-text)] sm:px-8"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1000px_460px_at_60%_12%,rgba(var(--om-accent-rgb),0.10),transparent_62%),var(--om-bg)]" />

        <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
          <BrandMark className="size-4" />
          Why me
        </p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-normal text-[var(--om-text)] sm:text-4xl">
          Why I think I can build this with you.
        </h1>

        <div className="mt-6 rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-4 text-sm leading-6 text-[var(--om-muted)] sm:p-5">
          You already saw the strongest proof. This whole prototype, extraction, matching,
          confidence, evals, and setup, was built specifically for Comena&apos;s problem, not adapted
          from a template.{" "}
          <TransitionLink href="/prototype" className="font-semibold text-[var(--om-accent)] hover:text-[var(--om-accent-hover)]">
            Revisit the prototype
          </TransitionLink>{" "}
          or{" "}
          <TransitionLink href="/thesis" className="font-semibold text-[var(--om-accent)] hover:text-[var(--om-accent-hover)]">
            how it works
          </TransitionLink>
          . What follows is the range behind it, briefly. Scroll to go through it.
        </div>

        <div className="relative mt-12">
          <span
            aria-hidden="true"
            className="absolute left-4 top-2 bottom-2 w-px bg-[var(--om-border)] sm:left-[1.125rem]"
          />
          {CARDS.map((card, index) => (
            <TimelineItem key={card.id} card={card} index={index} />
          ))}
        </div>

        <footer className="mt-2 flex flex-col items-start gap-3 border-t border-[var(--om-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <TransitionLink
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[var(--om-border)] bg-[var(--om-surface)] px-5 py-3 text-sm font-semibold text-[var(--om-muted)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--om-border-strong)] hover:text-[var(--om-text)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
          >
            Back to start
          </TransitionLink>
          <Button
            asChild
            className="bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
          >
            <TransitionLink href="/contact">
              Next step
              <ArrowRight aria-hidden="true" />
            </TransitionLink>
          </Button>
        </footer>
      </main>
    </AppShell>
  );
}
