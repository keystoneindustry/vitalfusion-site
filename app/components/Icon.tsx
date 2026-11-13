// Small line icons used on the homepage (no icon library needed).
const PATHS: Record<string, React.ReactNode> = {
  plate: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M3 4v5a2 2 0 0 0 2 2v9M5 4v5M21 4c-1.5 0-2.5 2-2.5 5s1 3 2.5 3v8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6" />
    </>
  ),
  infinity: <path d="M6.5 8.5C3 8.5 2 11 2 12s1 3.5 4.5 3.5S10 12 12 12s3.5-3.5 5.5-3.5S22 11 22 12s-1 3.5-4.5 3.5S14 12 12 12 10 8.5 6.5 8.5Z" />,
  dumbbell: <path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" />,
  chat: (
    <>
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  sound: (
    <>
      <path d="M4 9.5v5h4l5 4v-13l-5 4H4Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
};

export default function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
