"use client";

import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";

import { PRIMARY_CONTACT_CARD_CLASS, PRIMARY_CONTACT_ICON_CLASS } from "@/lib/contact-card-styles";

type CopyEmailLinkProps = {
  email: string;
};

export function CopyEmailLink({ email }: CopyEmailLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  }

  return (
    <a
      href={`mailto:${email}`}
      onClick={handleClick}
      aria-label={`Copy email address ${email}`}
      className={PRIMARY_CONTACT_CARD_CLASS}
    >
      <span className={PRIMARY_CONTACT_ICON_CLASS}>
        <Mail aria-hidden="true" className="size-5" />
      </span>
      <span className="text-base font-bold text-[var(--om-text)]">Email</span>
      <span className="text-sm text-[var(--om-muted)]">{email}</span>
      <span
        aria-live="polite"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--om-accent)]"
      >
        {copied ? (
          <>
            <Check aria-hidden="true" className="size-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy aria-hidden="true" className="size-3.5" />
            Copy email
          </>
        )}
      </span>
    </a>
  );
}
