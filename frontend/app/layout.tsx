import type { Metadata, Viewport } from "next";

import "./globals.css";

import { BackendWarmup } from "@/components/backend-warmup";

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
  title: "OrderMatch Lab — a prototype for Building Radar, by Harsh Bhardwaj",
  description:
    "A product matcher the user can teach: correct a SKU once and it stops making that mistake for that customer. Built by Harsh Bhardwaj in response to Building Radar's case challenge.",
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
    <html lang="en" suppressHydrationWarning>
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
