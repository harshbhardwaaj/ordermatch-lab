/**
 * Who this build is addressed to, and how it looks as a result.
 *
 * The same code ships to more than one audience: a private link addressed to a
 * specific company, and a public link addressed to nobody. Those differ only in
 * skin and salutation, never in behaviour, so they must not be different
 * branches. A fork drifts, and the bug you fix on one is the bug you still have
 * on the other.
 *
 * So: one codebase, one database, and the audience chosen at build time by
 * NEXT_PUBLIC_BRAND. Adding a brand is an entry in this file plus an env var on
 * the deployment, not a copy of the app.
 *
 * The default is deliberately "neutral". If the env var is missing or misspelt
 * on a deploy, the failure has to be the harmless one: a public URL that never
 * dressed itself in someone else's logo. Shipping a client's brand by accident
 * is the outcome worth engineering against, because a page carrying their mark
 * and palette reads as an official property of theirs, which it is not.
 *
 * Palette lives in app/globals.css, keyed on the same id via data-brand.
 */

export type BrandId = "neutral" | "buildingradar";

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

  /** Eyebrow above the problem statement. The addressed build can say "the
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
    subtitle:
      "Customers write shorthand, a part number, or German. Your catalog has 10,000 SKUs, the same item sold at four grades, and superseded parts still listed. The agent matches every line, shows how confident it is, and sends what it is unsure about to a human. Correct it once, and it stops making that mistake for that customer.",
  },
  contactHeadline: "Let's talk.",
  metaDescription:
    "A product matcher the user can teach: correct a SKU once and it stops making that mistake for that customer. Built by Harsh Bhardwaj.",
  proofAudience: "this kind of product",
  problemEyebrow: "The problem",
};

/**
 * The private link sent to Building Radar. Their palette and their mark,
 * because the page is a deliverable addressed to them and the hero copy
 * answers the case they set in the interview.
 *
 * Authorship stays unmistakable regardless: the byline is Harsh's on every
 * screen, and their logo is only ever the thing the letter is addressed to.
 */
const BUILDING_RADAR: Brand = {
  id: "buildingradar",
  addressee: "Building Radar",
  addresseeLogo: "/building-radar-logo.svg",
  navTitle: "Building Radar",
  navSubtitle: "Prototype by Harsh",
  hero: {
    eyebrow: "A prototype by Harsh Bhardwaj, for",
    headlineTop: "Twenty minutes wasn't enough.",
    headlineLead: "So I ",
    headlineAccent: "finished it",
    headlineTail: ".",
    subtitle:
      "You asked for a matcher the user can teach. Here it is, working: correct it once, and it stops making that mistake for that customer.",
  },
  contactHeadline: "Let's talk about Building Radar.",
  metaDescription:
    "A product matcher the user can teach: correct a SKU once and it stops making that mistake for that customer. Built by Harsh Bhardwaj in response to Building Radar's case challenge.",
  proofAudience: "Building Radar",
  problemEyebrow: "The problem you gave me",
};

/**
 * Deliberately a direct comparison against the inlined env var, and not a
 * lookup in a registry object.
 *
 * NEXT_PUBLIC_* values are substituted into the source at build time, so this
 * literally compiles to `"neutral" === "buildingradar" ? BUILDING_RADAR :
 * NEUTRAL`, folds to `NEUTRAL`, and the minifier then drops BUILDING_RADAR as
 * unreachable. A `BRANDS[key]` lookup cannot be folded, so both brands would
 * survive into the bundle and the public site would ship a client's name and
 * logo path in its JavaScript for anyone who opened devtools. It would never
 * render, but it would be there, which is not what "their mark is never on the
 * public build" should mean.
 *
 * Same reason BrandMark switches on the env var rather than on brand.id: it
 * keeps their SVG path out of the neutral bundle entirely.
 */
export const brand: Brand =
  process.env.NEXT_PUBLIC_BRAND === "buildingradar" ? BUILDING_RADAR : NEUTRAL;

export const isAddressedBuild = brand.addressee !== null;
