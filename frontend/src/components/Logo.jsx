export default function Logo({ className = 'w-[22px] h-[22px]', mark = false }) {
  return (
    <div
      className={`${className} bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center flex-shrink-0`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-white dark:text-zinc-900 ${mark ? 'w-[60%] h-[60%]' : 'w-[62%] h-[62%]'}`}
        strokeWidth={2.2}
      >
        <circle cx="16" cy="11" r="3.5" fill="currentColor" stroke="none" />
        <line x1="16" y1="15" x2="16" y2="25" />
        <path d="M16 19 L12 17" />
        <path d="M16 19 L20 17" />
      </svg>
    </div>
  );
}
