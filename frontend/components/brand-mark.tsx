type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="var(--om-accent)" />
      <path
        d="M15 23V15H23M33 25V33H25"
        stroke="var(--om-accent-text)"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="4.5"
      />
      <rect x="21.5" y="21.5" width="5" height="5" fill="var(--om-accent-text)" transform="rotate(45 24 24)" />
    </svg>
  );
}
