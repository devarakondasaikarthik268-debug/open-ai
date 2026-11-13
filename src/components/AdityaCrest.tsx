export function AdityaCrest({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="adityaCrestGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="55%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#adityaCrestGrad)" />
      <path
        d="M20 8L30 28H25.8L23.7 23.4H16.3L14.2 28H10L20 8ZM20 14.3L17.6 19.8H22.4L20 14.3Z"
        fill="white"
      />
      <circle cx="20" cy="31.5" r="1.5" fill="#C4B5FD" />
    </svg>
  );
}
