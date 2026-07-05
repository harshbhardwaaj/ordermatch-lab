type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="var(--om-accent)" />
      <circle cx="18" cy="18" r="4" fill="var(--om-accent-text)" />
      <circle cx="30" cy="18" r="4" fill="var(--om-accent-text)" opacity="0.72" />
      <circle cx="18" cy="30" r="4" fill="var(--om-accent-text)" opacity="0.72" />
      <path d="M22 28 30.5 19.5" stroke="var(--om-bg)" strokeLinecap="round" strokeWidth="3.2" />
      <path
        d="m27 29.5 3.4 3.2L37 25"
        stroke="var(--om-accent-text)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}
