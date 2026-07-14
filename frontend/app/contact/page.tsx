import { Calendar, Github, Linkedin, Phone } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { brand } from "@/lib/brand";
import { CopyEmailLink } from "@/components/narrative/copy-email-link";
import { PRIMARY_CONTACT_CARD_CLASS, PRIMARY_CONTACT_ICON_CLASS } from "@/lib/contact-card-styles";

const EMAIL = "harshbhardwaaj29@gmail.com";
const PHONE_DISPLAY = "+49 1525 2454724";
const PHONE_HREF = "tel:+4915252454724";

const secondaryLinks = [
  {
    label: "GitHub",
    href: "https://github.com/harshbhardwaaj",
    icon: Github,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/harshbhaardwaj/",
    icon: Linkedin,
  },
] as const;

export default function ContactPage() {
  return (
    <AppShell>
      <main
        id="main"
        className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-10 text-[var(--om-text)] sm:px-8"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_440px_at_58%_18%,rgba(var(--om-accent-rgb),0.12),transparent_62%),var(--om-bg)]" />

        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
          Get in touch
        </p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-[var(--om-text)] sm:text-4xl">
          {brand.contactHeadline}
        </h1>
        <p className="mt-3 text-base leading-7 text-[var(--om-muted)]">
          Book a call, email, or call directly, whichever is easiest.
        </p>

        <section
          aria-label="Primary contact actions"
          className="mt-8 grid gap-4 sm:grid-cols-3"
        >
          <a
            href="https://calendly.com/harshbhardwaaj29/chat-with-harsh"
            rel="noreferrer"
            target="_blank"
            className={PRIMARY_CONTACT_CARD_CLASS}
          >
            <span className={PRIMARY_CONTACT_ICON_CLASS}>
              <Calendar aria-hidden="true" className="size-5" />
            </span>
            <span className="text-base font-bold text-[var(--om-text)]">Book a call</span>
            <span className="text-sm text-[var(--om-muted)]">Pick a time on Calendly</span>
          </a>

          <CopyEmailLink email={EMAIL} />

          <a href={PHONE_HREF} className={PRIMARY_CONTACT_CARD_CLASS}>
            <span className={PRIMARY_CONTACT_ICON_CLASS}>
              <Phone aria-hidden="true" className="size-5" />
            </span>
            <span className="text-base font-bold text-[var(--om-text)]">Call</span>
            <span className="text-sm text-[var(--om-muted)]">{PHONE_DISPLAY}</span>
          </a>
        </section>

        <section
          aria-label="Other links"
          className="mt-10 flex flex-wrap items-center gap-3 border-t border-[var(--om-border)] pt-6"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--om-subtle)]">
            Also here
          </span>
          {secondaryLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                rel="noreferrer"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--om-border)] px-3.5 py-1.5 text-sm font-medium text-[var(--om-muted)] outline-none transition-colors duration-200 hover:border-[var(--om-border-strong)] hover:text-[var(--om-text)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {link.label}
              </a>
            );
          })}
        </section>
      </main>
    </AppShell>
  );
}
