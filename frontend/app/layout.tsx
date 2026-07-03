import type { Metadata, Viewport } from "next";

import "./globals.css";

const shellStateScript = `
  try {
    const storedTheme = localStorage.getItem("ordermatch-theme");
    document.documentElement.dataset.theme = storedTheme === "dark" ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "light";
  }

  try {
    const storedNavOpen = localStorage.getItem("ordermatch-nav-open");
    document.documentElement.dataset.navOpen = storedNavOpen === "true" ? "true" : "false";
  } catch {
    document.documentElement.dataset.navOpen = "false";
  }
`;

export const metadata: Metadata = {
  title: "OrderMatch Lab",
  description:
    "A research-informed order operations prototype for extraction, SKU matching, review, ERP readiness, and evals.",
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
      <body>{children}</body>
    </html>
  );
}
