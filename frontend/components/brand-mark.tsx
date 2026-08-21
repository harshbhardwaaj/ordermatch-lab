type BrandMarkProps = {
  className?: string;
};

/** The app's own mark: two carets closing on a single point, which is what the
 * product does — many ways of writing a part, one SKU. Owes nothing to anyone
 * else's brand, and is painted from theme tokens so it works on both themes.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="var(--om-accent)"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 10 L20 24 L6 38" />
      <path d="M42 10 L28 24 L42 38" />
      <circle cx="24" cy="24" r="2.6" fill="var(--om-accent)" stroke="none" />
    </svg>
  );
}
