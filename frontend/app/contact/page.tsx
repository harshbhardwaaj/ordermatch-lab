import { AppShell } from "@/components/app-shell";
import { RouteShell } from "@/components/narrative/route-shell";
import { icons } from "@/lib/icons";

const contactLinks = [
  {
    label: "Quick call",
    value: "Calendar link pending",
  },
  {
    label: "Email",
    value: "Preferred email pending",
  },
  {
    href: "https://github.com/harshbhardwaaj",
    label: "GitHub",
    value: "github.com/harshbhardwaaj",
  },
  {
    label: "LinkedIn",
    value: "Profile link pending",
  },
] as const;

export default function ContactPage() {
  const ExternalLink = icons.externalLink;

  return (
    <AppShell>
      <RouteShell
        eyebrow="Next step"
        title="A simple way to continue."
        description="This page keeps the next step simple, with supporting links nearby once the final contact details are selected."
        primaryHref="/prototype"
        primaryLabel="Back to what I built"
        items={[
          "Ask for a short conversation.",
          "Use email as the fallback if there is no calendar link.",
          "Keep GitHub and LinkedIn nearby for quick inspection.",
          "Mark unavailable links clearly instead of sending people nowhere.",
        ]}
      >
        <section
          aria-label="Contact links"
          className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {contactLinks.map((link) => {
            const content = (
              <>
                <span className="text-sm font-semibold text-[var(--om-text)]">
                  {link.label}
                </span>
                <span className="mt-1 text-xs leading-5 text-[var(--om-muted)]">
                  {link.value}
                </span>
                {"href" in link ? (
                  <ExternalLink
                    aria-hidden="true"
                    className="absolute right-4 top-4 size-4 text-[var(--om-accent)]"
                  />
                ) : null}
              </>
            );

            return "href" in link ? (
              <a
                key={link.label}
                href={link.href}
                rel="noreferrer"
                target="_blank"
                className="relative flex min-h-28 flex-col rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)]/82 p-4 outline-none transition-colors duration-200 hover:border-[var(--om-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
              >
                {content}
              </a>
            ) : (
              <div
                key={link.label}
                className="relative flex min-h-28 flex-col rounded-xl border border-[var(--om-border)] bg-[var(--om-surface-2)]/82 p-4"
              >
                {content}
              </div>
            );
          })}
        </section>
      </RouteShell>
    </AppShell>
  );
}
