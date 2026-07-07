"use client";

import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, FileText, Mail, RotateCcw, UserRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import { cn } from "@/lib/utils";

const inputItems = [
  { label: "Email", icon: Mail },
  { label: "PDF", icon: FileText },
  { label: "Form", icon: FileText },
] as const;

const DESKTOP_DIAGRAM_BREAKPOINT_PX = 1024;
const ARROW_STANDOFF_PX = 6;
const LOOP_STANDOFF_PX = 8;
const LABEL_FONT_SIZE_PX = 8.5;
const LABEL_LETTER_SPACING_PX = 0.7;
const LABEL_HEIGHT_PX = 18;
const AFTER_FIX_LABEL_WIDTH_PX = 76;
const CLEAR_LABEL_WIDTH_PX = 50;
const NEEDS_REVIEW_LABEL_WIDTH_PX = 50;
const NEEDS_REVIEW_LABEL_HEIGHT_PX = 28;

type Point = { x: number; y: number };

type ConnectorPoints = {
  width: number;
  height: number;
  orderToAi: { from: Point; to: Point };
  aiToErp: { from: Point; to: Point };
  aiToHuman: { from: Point; to: Point };
  humanToErp: { from: Point; to: Point };
};

const FlowCard = forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(
  function FlowCard({ children, className }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm",
          className,
        )}
      >
        {children}
      </div>
    );
  },
);

function MobileArrow() {
  return (
    <div aria-hidden="true" className="flex justify-center text-[var(--om-accent)] lg:hidden">
      <ArrowRight className="size-5 rotate-90" />
    </div>
  );
}

function relativeAnchor(el: HTMLElement, containerRect: DOMRect) {
  const elRect = el.getBoundingClientRect();

  return {
    left: elRect.left - containerRect.left,
    right: elRect.right - containerRect.left,
    top: elRect.top - containerRect.top,
    bottom: elRect.bottom - containerRect.top,
    centerX: elRect.left - containerRect.left + elRect.width / 2,
    centerY: elRect.top - containerRect.top + elRect.height / 2,
  };
}

function useWorkflowConnectors(
  containerRef: React.RefObject<HTMLDivElement | null>,
  orderRef: React.RefObject<HTMLDivElement | null>,
  aiRef: React.RefObject<HTMLDivElement | null>,
  erpRef: React.RefObject<HTMLDivElement | null>,
  humanRef: React.RefObject<HTMLDivElement | null>,
) {
  const [points, setPoints] = useState<ConnectorPoints | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function measure() {
      const containerEl = containerRef.current;
      const orderEl = orderRef.current;
      const aiEl = aiRef.current;
      const erpEl = erpRef.current;
      const humanEl = humanRef.current;

      if (!containerEl || !orderEl || !aiEl || !erpEl || !humanEl) {
        return;
      }

      if (window.innerWidth < DESKTOP_DIAGRAM_BREAKPOINT_PX) {
        setPoints(null);
        return;
      }

      const containerRect = containerEl.getBoundingClientRect();
      const order = relativeAnchor(orderEl, containerRect);
      const ai = relativeAnchor(aiEl, containerRect);
      const erp = relativeAnchor(erpEl, containerRect);
      const human = relativeAnchor(humanEl, containerRect);

      const erpOffsetY = ai.centerY - erp.centerY;
      const humanOffsetY = human.centerY - ai.centerY;
      const symmetricOffsetY = (erpOffsetY + humanOffsetY) / 2;
      const erpTargetY = ai.centerY - symmetricOffsetY;
      const humanTargetY = ai.centerY + symmetricOffsetY;

      setPoints({
        width: containerRect.width,
        height: containerRect.height,
        orderToAi: {
          from: { x: order.right + ARROW_STANDOFF_PX, y: order.centerY },
          to: { x: ai.left - ARROW_STANDOFF_PX, y: ai.centerY },
        },
        aiToErp: {
          from: { x: ai.right + ARROW_STANDOFF_PX, y: ai.centerY },
          to: { x: erp.left - ARROW_STANDOFF_PX, y: erpTargetY },
        },
        aiToHuman: {
          from: { x: ai.right + ARROW_STANDOFF_PX, y: ai.centerY },
          to: { x: human.left - ARROW_STANDOFF_PX, y: humanTargetY },
        },
        humanToErp: {
          from: { x: human.centerX, y: human.top - LOOP_STANDOFF_PX },
          to: { x: erp.centerX, y: erp.bottom + LOOP_STANDOFF_PX },
        },
      });
    }

    measure();
    const raf = requestAnimationFrame(measure);

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, orderRef, aiRef, erpRef, humanRef]);

  return points;
}

function cubicPointAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;

  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function forkCurve(from: Point, to: Point) {
  const midX = from.x + (to.x - from.x) / 2;
  const p1 = { x: midX, y: from.y };
  const p2 = { x: midX, y: to.y };

  return {
    d: `M ${from.x} ${from.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${to.x} ${to.y}`,
    midpoint: cubicPointAt(from, p1, p2, to, 0.5),
  };
}

function straightLine(from: Point, to: Point) {
  return {
    d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
    midpoint: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
  };
}

const monoFont = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)";

function WorkflowConnectors({ points }: { points: ConnectorPoints }) {
  const orderToAi = forkCurve(points.orderToAi.from, points.orderToAi.to);
  const clear = forkCurve(points.aiToErp.from, points.aiToErp.to);
  const needsReview = forkCurve(points.aiToHuman.from, points.aiToHuman.to);
  const afterFix = straightLine(points.humanToErp.from, points.humanToErp.to);
  const clearLabelY = clear.midpoint.y - 16;
  const needsReviewLabelY = needsReview.midpoint.y + 22;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
      fill="none"
      height={points.height}
      viewBox={`0 0 ${points.width} ${points.height}`}
      width={points.width}
    >
      <defs>
        <marker
          id="workflow-arrow"
          markerHeight="7"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
          viewBox="0 0 7 7"
        >
          <path d="M0 0 7 3.5 0 7z" fill="var(--om-accent)" />
        </marker>
        <marker
          id="workflow-arrow-muted"
          markerHeight="7"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
          viewBox="0 0 7 7"
        >
          <path d="M0 0 7 3.5 0 7z" fill="var(--om-muted)" />
        </marker>
      </defs>

      <path
        d={orderToAi.d}
        markerEnd="url(#workflow-arrow)"
        stroke="var(--om-accent)"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d={clear.d}
        markerEnd="url(#workflow-arrow)"
        stroke="var(--om-accent)"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d={needsReview.d}
        markerEnd="url(#workflow-arrow-muted)"
        stroke="var(--om-muted)"
        strokeDasharray="7 8"
        strokeLinecap="round"
        strokeWidth="1.55"
      />
      <path
        d={afterFix.d}
        markerEnd="url(#workflow-arrow)"
        stroke="var(--om-accent)"
        strokeLinecap="round"
        strokeWidth="1.6"
      />

      <rect
        fill="var(--om-surface)"
        height={LABEL_HEIGHT_PX}
        rx={LABEL_HEIGHT_PX / 2}
        stroke="var(--om-border)"
        width={CLEAR_LABEL_WIDTH_PX}
        x={clear.midpoint.x - CLEAR_LABEL_WIDTH_PX / 2}
        y={clearLabelY - LABEL_HEIGHT_PX / 2}
      />
      <text
        fill="var(--om-accent)"
        fontFamily={monoFont}
        fontSize={LABEL_FONT_SIZE_PX}
        fontWeight="700"
        letterSpacing={LABEL_LETTER_SPACING_PX}
        textAnchor="middle"
        x={clear.midpoint.x}
        y={clearLabelY + 3}
      >
        CLEAR
      </text>

      <rect
        fill="var(--om-surface)"
        height={NEEDS_REVIEW_LABEL_HEIGHT_PX}
        rx={10}
        stroke="var(--om-border)"
        width={NEEDS_REVIEW_LABEL_WIDTH_PX}
        x={needsReview.midpoint.x - NEEDS_REVIEW_LABEL_WIDTH_PX / 2}
        y={needsReviewLabelY - NEEDS_REVIEW_LABEL_HEIGHT_PX / 2}
      />
      <text
        fill="var(--om-muted)"
        fontFamily={monoFont}
        fontSize={LABEL_FONT_SIZE_PX}
        fontWeight="700"
        letterSpacing={LABEL_LETTER_SPACING_PX}
        textAnchor="middle"
        x={needsReview.midpoint.x}
      >
        <tspan x={needsReview.midpoint.x} y={needsReviewLabelY - 4}>
          NEEDS
        </tspan>
        <tspan x={needsReview.midpoint.x} y={needsReviewLabelY + 7}>
          REVIEW
        </tspan>
      </text>

      <rect
        fill="var(--om-surface)"
        height={LABEL_HEIGHT_PX}
        rx={LABEL_HEIGHT_PX / 2}
        stroke="var(--om-border)"
        width={AFTER_FIX_LABEL_WIDTH_PX}
        x={afterFix.midpoint.x - AFTER_FIX_LABEL_WIDTH_PX / 2}
        y={afterFix.midpoint.y - LABEL_HEIGHT_PX / 2}
      />
      <text
        fill="var(--om-accent)"
        fontFamily={monoFont}
        fontSize={LABEL_FONT_SIZE_PX}
        fontWeight="700"
        letterSpacing={LABEL_LETTER_SPACING_PX}
        textAnchor="middle"
        x={afterFix.midpoint.x}
        y={afterFix.midpoint.y + 3}
      >
        AFTER FIX
      </text>
    </svg>
  );
}

export function PrototypeWorkflow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const orderRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const erpRef = useRef<HTMLDivElement>(null);
  const humanRef = useRef<HTMLDivElement>(null);

  const points = useWorkflowConnectors(containerRef, orderRef, aiRef, erpRef, humanRef);

  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
      >
        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8">
          <div className="max-w-5xl">
            <p className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-[var(--om-accent)] sm:text-base">
              The workflow
            </p>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-normal text-[var(--om-text)] sm:text-3xl">
              Most orders never need a person.
            </h1>
            <p className="mt-3 max-w-4xl text-xs leading-5 text-[var(--om-muted)] sm:text-sm">
              Turn a messy customer order into a checked order path: read it, match it,
              show confidence, and send uncertain details to a person.
            </p>
          </div>

          <div
            ref={containerRef}
            className="relative grid items-center gap-4 lg:grid-cols-[0.62fr_0.72fr_0.85fr] lg:gap-x-20 lg:gap-y-3"
          >
            {points ? <WorkflowConnectors points={points} /> : null}

            <FlowCard ref={orderRef} className="relative z-10 lg:row-span-2">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[var(--om-muted)]">
                Order comes in
              </p>
              <div className="mt-2.5 grid gap-2">
                {inputItems.map((item) => {
                  const ItemIcon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 text-sm font-semibold text-[var(--om-text)]"
                    >
                      <ItemIcon aria-hidden="true" className="size-4 text-[var(--om-muted)]" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </FlowCard>

            <MobileArrow />

            <FlowCard
              ref={aiRef}
              className="relative z-10 border-[var(--om-accent)] bg-[var(--om-accent-soft)]/45 p-3.5 shadow-[0_16px_42px_rgba(var(--om-accent-rgb),0.12)] lg:row-span-2"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-[var(--om-accent)] text-[var(--om-accent-text)]">
                  <BrandMark className="size-6" />
                </span>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[var(--om-accent)]">
                  AI-assisted review
                </p>
              </div>
              <p className="mt-2 text-sm font-bold leading-5 text-[var(--om-text)]">
                Read the order, match products, and show confidence before anything moves on.
              </p>
            </FlowCard>

            <MobileArrow />

            <p className="text-center font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--om-subtle)] lg:hidden">
              Splits into two outcomes, based on confidence
            </p>

            <div className="relative z-10 grid gap-4 lg:gap-16">
              <FlowCard ref={erpRef} className="border-[var(--om-accent)]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 aria-hidden="true" className="size-5 text-[var(--om-accent)]" />
                  <div>
                    <h2 className="text-base font-extrabold text-[var(--om-accent)]">
                      Ready for ERP
                    </h2>
                    <p className="mt-1 text-sm font-medium text-[var(--om-muted)]">
                      When the details are clear.
                    </p>
                  </div>
                </div>
              </FlowCard>

              <FlowCard ref={humanRef} className="border-dashed border-[var(--om-border-strong)] bg-[var(--om-bg)]">
                <div className="flex items-center gap-3">
                  <UserRound aria-hidden="true" className="size-5 text-[var(--om-muted)]" />
                  <div>
                    <h2 className="text-base font-extrabold text-[var(--om-text)]">
                      Human reviews
                    </h2>
                    <p className="mt-1 text-sm font-medium text-[var(--om-muted)]">
                      When the prototype is unsure.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] px-3 py-2 text-xs font-semibold text-[var(--om-muted)]">
                  <RotateCcw aria-hidden="true" className="size-4 text-[var(--om-accent)]" />
                  <span>Review fixes the detail, then the order can move to ERP.</span>
                </div>
              </FlowCard>
            </div>
          </div>

          <div className="flex flex-col items-start">
            <Button
              asChild
              size="lg"
              className="h-12 w-full bg-[var(--om-accent)] px-8 text-base text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)] sm:w-auto"
            >
              <TransitionLink href="/prototype/start">
                Experience it yourself
                <ArrowRight aria-hidden="true" />
              </TransitionLink>
            </Button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
