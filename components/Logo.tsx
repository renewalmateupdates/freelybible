/** Freely mark: an open book with light rising from its pages. */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 11.5c-2.6-2-6.3-2.8-10.5-2.5v15c4.2-.3 7.9.5 10.5 2.5 2.6-2 6.3-2.8 10.5-2.5V9c-4.2-.3-7.9.5-10.5 2.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16 11.5v15" stroke="currentColor" strokeWidth="2" />
      <path d="M16 3v4M10.5 4.5l1.6 3M21.5 4.5l-1.6 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
