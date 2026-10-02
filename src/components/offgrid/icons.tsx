/**
 * Small line icons for Spend Time Off Grid surfaces — inline SVGs so no icon
 * library is needed. All inherit `currentColor`; size with a className.
 */
type P = { className?: string };

function Svg({ className = "h-5 w-5", children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Help / contribution — a sprout. */
export const SproutIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 21v-9" />
    <path d="M12 12c0-4 2.7-6.5 7-6.5 0 4.3-2.6 6.5-7 6.5z" />
    <path d="M12 14.5c0-3.4-2.3-5.5-6-5.5 0 3.6 2.2 5.5 6 5.5z" />
  </Svg>
);

export const HouseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </Svg>
);

export const BookIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 6.5C10.2 5.2 7.6 4.5 4 4.5v13c3.6 0 6.2.7 8 2 1.8-1.3 4.4-2 8-2v-13c-3.6 0-6.2.7-8 2z" />
    <path d="M12 6.5v13" />
  </Svg>
);

export const BedIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 18.5V6.5" />
    <path d="M3 14h18v4.5" />
    <path d="M21 14v-2.5a3 3 0 0 0-3-3h-7V14" />
    <circle cx="7" cy="10.5" r="1.8" />
  </Svg>
);

export const MealIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 3.5v17" />
    <path d="M4.5 3.5v4.5a2.5 2.5 0 0 0 5 0V3.5" />
    <path d="M17 20.5v-17c-2.2 1-3.5 3.6-3.5 7 0 1.6.9 2.5 2.2 2.5H17" />
  </Svg>
);

export const PinIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
);

export const CalendarIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </Svg>
);

export const ClockIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const SearchIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </Svg>
);

export const PlaneIcon = (p: P) => (
  <Svg {...p}>
    <path d="M10.5 13.5 4 11l1.5-1.5 7 .5 4.5-4.5c1-1 2.7-1.2 3.2-.7s.3 2.2-.7 3.2L15 12.5l.5 7L14 21l-2.5-6.5" />
    <path d="M10.5 13.5 8 16l-3-.5" />
  </Svg>
);

export const ArrowRightIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
