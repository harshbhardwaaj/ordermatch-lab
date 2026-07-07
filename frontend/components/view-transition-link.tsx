"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { startTransition } from "react";
import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";

type ViewTransitionDocument = Document & {
  startViewTransition?: (
    updateCallback: () => void | Promise<void>,
  ) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition: () => void;
  };
};

type TransitionLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
  };

function getHrefString(href: LinkProps["href"]) {
  if (typeof href === "string") {
    return href;
  }

  const pathname = href.pathname ?? "";
  const query = href.query
    ? `?${new URLSearchParams(
        Object.entries(href.query).map(([key, value]) => [
          key,
          String(value),
        ]),
      ).toString()}`
    : "";
  const hash = href.hash ? `#${href.hash}` : "";

  return `${pathname}${query}${hash}`;
}

export function TransitionLink({
  children,
  href,
  onClick,
  replace,
  scroll,
  target,
  ...props
}: TransitionLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hrefString = getHrefString(href);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    const doc = document as ViewTransitionDocument;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const url = new URL(hrefString, window.location.href);
    const isModifiedClick =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    const isExternal = url.origin !== window.location.origin;
    const isSamePath = url.pathname === pathname && !url.hash;

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      isModifiedClick ||
      target === "_blank" ||
      isExternal ||
      isSamePath ||
      prefersReducedMotion ||
      !doc.startViewTransition
    ) {
      return;
    }

    event.preventDefault();

    const transition = doc.startViewTransition(() => {
      startTransition(() => {
        if (replace) {
          router.replace(hrefString, { scroll });
        } else {
          router.push(hrefString, { scroll });
        }
      });
    });

    // The browser aborts an in-flight transition if another navigation
    // starts before it finishes (e.g. fast repeated clicks). That's
    // expected and harmless, but leaves an unhandled rejection on
    // `finished` if nothing catches it.
    transition.finished.catch(() => {});
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      replace={replace}
      scroll={scroll}
      target={target}
      {...props}
    >
      {children}
    </Link>
  );
}
