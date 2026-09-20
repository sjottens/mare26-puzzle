import type { ReactNode } from "react";

export type IconName =
  | "fill" | "cross" | "erase" | "undo" | "redo" | "bulb" | "check" | "pause" | "back" | "heart" | "star" | "lock"
  | "settings" | "museum" | "calendar" | "flame" | "share" | "play" | "close" | "menu" | "help" | "chart" | "infinity"
  | "restart" | "next" | "eye";

const PATHS: Record<IconName, ReactNode> = {
  fill: <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" stroke="none" />,
  cross: <path d="M6 6l12 12M18 6L6 18" strokeWidth="3" />,
  erase: <path d="M4 16l9-9a2.5 2.5 0 013.5 0l2 2a2.5 2.5 0 010 3.5L12 19H7zM9 19h11" />,
  undo: <path d="M9 7L4 12l5 5M4 12h10a6 6 0 010 12h-2" transform="translate(0 -3)" />,
  redo: <path d="M15 7l5 5-5 5M20 12H10a6 6 0 000 12h2" transform="translate(0 -3)" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="3" />,
  pause: <path d="M8 5v14M16 5v14" strokeWidth="3.5" />,
  back: <path d="M15 5l-7 7 7 7" strokeWidth="3" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.6-7 10-7 10z" fill="currentColor" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" />,
  lock: <path d="M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z" />,
  settings: <path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM19 12l2-1.5-2-3.5-2.4.8a7 7 0 00-1.6-.9L14.6 4h-4l-.4 2.9a7 7 0 00-1.6.9L6 7 4 10.5 6 12a7 7 0 000 1.9L4 15.5 6 19l2.6-.8a7 7 0 001.6.9l.4 2.9h4l.4-2.9a7 7 0 001.6-.9L19 19l2-3.5-2-1.6c.1-.6.1-1.3 0-1.9z" transform="translate(0 -1) scale(.96) translate(.5 .5)" />,
  museum: <path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18" />,
  calendar: <path d="M5 6h14v14H5zM5 10h14M9 3v5M15 3v5" />,
  flame: <path d="M12 3c1 4 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" fill="currentColor" />,
  share: <path d="M12 15V4M8 8l4-4 4 4M5 12v8h14v-8" />,
  play: <path d="M8 5l11 7-11 7z" fill="currentColor" />,
  close: <path d="M6 6l12 12M18 6L6 18" strokeWidth="3" />,
  menu: <path d="M5 7h14M5 12h14M5 17h14" strokeWidth="3" />,
  help: <path d="M9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4M12 17.5v.5" strokeWidth="2.6" />,
  chart: <path d="M5 20V10M12 20V4M19 20v-7" strokeWidth="3.5" />,
  infinity: <path d="M8 8c-3 0-4.5 2-4.5 4S5 16 8 16c4 0 4-8 8-8 3 0 4.5 2 4.5 4s-1.500 4-4.500 4c-4 0-4-8-8-8z" />,
  restart: <path d="M4 12a8 8 0 108-8M4 4v5h5" />,
  next: <path d="M9 5l7 7-7 7" strokeWidth="3" />,
  eye: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />,
};

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
