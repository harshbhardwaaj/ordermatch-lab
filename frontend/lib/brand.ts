/**
 * Who this build is addressed to, and how it looks as a result.
 *
 * The same code can ship to more than one audience: a public link addressed to
 * nobody, and — when there is one — a private link addressed to a specific
 * company. Those differ only in skin and salutation, never in behaviour, so
 * they must not be different branches. A fork drifts, and the bug you fix on
 * one is the bug you still have on the other.
 *
 * So: one codebase, one database, and the audience chosen at build time. Today
 * there is exactly one audience, `neutral`, and it is the default. Adding an
 * addressed build is an entry in this file, a `data-brand` palette block in
 * app/globals.css keyed on the same id, and an env var on that deployment —
 * never a copy of the app.
 *
 * If an addressed build is ever added back, keep the selector below a direct
 * comparison against the inlined NEXT_PUBLIC_* value rather than a lookup in a
 * registry object. Next substitutes those at build time, so a comparison folds
 * to a constant and the minifier drops the unreachable brand entirely. A
 * `BRANDS[key]` lookup cannot be folded, so every brand would survive into the
 * bundle and the public site would ship a client's name and logo path in its
 * JavaScript for anyone who opened devtools. It would never render, but it
 * would be there, which is not what "their mark is never on the public build"
 * should mean. Same reason BrandMark renders its glyph inline rather than
 * choosing between several.
 *
 * The default is deliberately the neutral one. If an env var is ever missing or
 * misspelt on a deploy, the failure has to be the harmless one: a public URL
 * that never dressed itself in someone else's logo. Shipping a client's brand
 * by accident is the outcome worth engineering against, because a page carrying
 * their mark and palette reads as an official property of theirs, which it is
 * not.
 */

export type BrandId = "neutral";

export type Brand = {
  id: BrandId;

  /** The company this copy is addressed to, or null for the public build.
   *  This is the *addressee*, never the author. The byline is always Harsh. */
  addressee: string | null;

  /** The addressee's own logo, shown once in the hero as the salutation.
   *  Their mark appears because the page is a letter to them; it never appears
   *  as the byline, and it is never on the public build. */
  addresseeLogo: string | null;

  /** Chrome. What the nav rail calls this thing. */
  navTitle: string;
  navSubtitle: string;

  hero: {
    /** Sits above the addressee's logo, so it reads "…, for [their logo]". */
    eyebrow: string;
    /**
     * Rendered as up to three lines:
     *   headlineTop
     *   headlineMid          (optional)
     *   headlineLead <accent>headlineAccent</accent> headlineTail
     *
     * Punctuation lives in the strings rather than the component, so a brand can
     * end a line however it wants without the markup deciding for it.
     */
    headlineTop: string;
    headlineMid?: string;
    headlineLead: string;
    headlineAccent: string;
    headlineTail: string;
    subtitle: string;
  };

  contactHeadline: string;
  metaDescription: string;

  /** Fills "Relevant here because ___ needs builders who…" on the proof page. */
  proofAudience: string;

  /** Eyebrow above the problem statement. An addressed build can say "the
   *  problem you gave me", because they did. A stranger on a public link gave
   *  nobody anything, and copy that talks past its reader is worse than plain. */
  problemEyebrow: string;
};

/**
 * The public build. No client, no salutation, no borrowed palette.
 * This is what goes on LinkedIn or to anyone who has not been written to
 * directly. The hero has to carry itself without the "you asked for this"
 * framing, because the reader never asked for anything.
 */
const NEUTRAL: Brand = {
  id: "neutral",
  addressee: null,
  addresseeLogo: null,
  navTitle: "OrderMatch Lab",
  navSubtitle: "Prototype by Harsh",
  hero: {
    eyebrow: "A prototype by Harsh Bhardwaj",
    // Says what the thing IS in the first five words. The public reader has no
    // context and did not ask for anything, so a clever line lands on nobody:
    // name the product, then earn it with specifics rather than adjectives.
    headlineTop: "An AI agent for order matching.",
    headlineMid: "Messy email in, correct SKU out,",
    headlineLead: "with ",
    headlineAccent: "memory and context",
    headlineTail: " preserved.",
    // One line. The headline already said what it is, and the pages after this
    // one explain the rest properly; a hero that explains everything is a hero
    // nobody finishes reading.
    subtitle:
      "10,000 SKUs, the same part at four grades, superseded ones still listed. Correct it once, and it stops making that mistake for that customer.",
  },
  contactHeadline: "Let's talk.",
  metaDescription:
    "A product matcher the user can teach: correct a SKU once and it stops making that mistake for that customer. Built by Harsh Bhardwaj.",
  proofAudience: "this kind of product",
  problemEyebrow: "The problem",
};

export const brand: Brand = NEUTRAL;
