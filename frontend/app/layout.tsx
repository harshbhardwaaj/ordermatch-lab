import type { Metadata, Viewport } from "next";

import "./globals.css";

import { BackendWarmup } from "@/components/backend-warmup";
import { brand } from "@/lib/brand";

const shellStateScript = `
  try {
    const storedTheme = localStorage.getItem("ordermatch-theme");
    document.documentElement.dataset.theme = storedTheme === "dark" ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "light";
  }

  try {
    const storedNavOpen = localStorage.getItem("ordermatch-nav-open");
    document.documentElement.dataset.navOpen = storedNavOpen === "false" ? "false" : "true";
  } catch {
    document.documentElement.dataset.navOpen = "true";
  }
`;

export const metadata: Metadata = {
  // Short enough to survive a browser tab. The full framing lives in the
  // description and on the page itself, where there is room for it; a title
  // that gets truncated to "OrderMatch Lab — a protot..." communicates nothing
  // that the first two words did not.
  title: "OrderMatch",
  // Per brand: the addressed build says who it was written for, the public one
  // does not name a company it was not written for (lib/brand.ts).
  description: brand.metaDescription,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-brand drives the palette (app/globals.css). Server-rendered rather
    // than set by a script, because the brand is fixed at build time and a
    // client-side swap would show the wrong colours for a frame.
    <html lang="en" data-brand={brand.id} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: shellStateScript }} />
      </head>
      <body>
        <BackendWarmup />
        {children}
      </body>
    </html>
  );
}
