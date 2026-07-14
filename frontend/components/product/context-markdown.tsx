import type { ReactNode } from "react";

/** A deliberately tiny markdown renderer.
 *
 * The agent that writes context.md emits exactly four things: `#`/`##`
 * headings, `-` bullets, `**bold**` and `` `code` ``. Pulling in a full
 * markdown library (and its sanitizer, and its bundle) to render four
 * constructs is not a trade worth making, and building React nodes directly
 * means no dangerouslySetInnerHTML and therefore no injection surface at all.
 * If the file ever needs tables or links, take the dependency then.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Split on **bold** and `code`, keeping the delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-[var(--om-text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded bg-[var(--om-surface-3)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--om-accent)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

export function ContextMarkdown({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-1 flex flex-col gap-1.5">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex gap-2 text-sm leading-6 text-[var(--om-muted)]">
            <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-[var(--om-accent)]" />
            <span>{renderInline(bullet, `li-${blocks.length}-${index}`)}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  }

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      continue;
    }

    flushBullets();

    if (!line) continue;

    if (line.startsWith("## ")) {
      blocks.push(
        <h3
          key={`h3-${blocks.length}`}
          className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--om-accent)] first:mt-0"
        >
          {line.slice(3)}
        </h3>,
      );
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h2
          key={`h2-${blocks.length}`}
          className="text-base font-bold text-[var(--om-text)]"
        >
          {line.slice(2)}
        </h2>,
      );
      continue;
    }

    blocks.push(
      <p key={`p-${blocks.length}`} className="text-sm leading-6 text-[var(--om-muted)]">
        {renderInline(line, `p-${blocks.length}`)}
      </p>,
    );
  }

  flushBullets();

  return <div className="flex flex-col gap-2">{blocks}</div>;
}
