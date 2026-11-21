import type { ReactNode } from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

function Icon({ children, size = 18, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

const make = (children: ReactNode) => (props: IconProps) => <Icon {...props}>{children}</Icon>;

export const IconOverview = make(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </>,
);

export const IconFolder = make(
  <>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.5.7l1 1.2a2 2 0 0 0 1.5.7h5.8A2.5 2.5 0 0 1 21 10.1v6.4A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
  </>,
);

export const IconSample = make(
  <>
    <path d="M9 3h6" />
    <path d="M10.5 3v12.5a1.5 1.5 0 0 0 3 0V3" />
    <path d="M10.5 10h3" />
  </>,
);

export const IconPipeline = make(
  <>
    <path d="M4 6h6l2 3h8" />
    <path d="M20 15h-6l-2-3" />
    <circle cx="4" cy="6" r="1.6" />
    <circle cx="20" cy="15" r="1.6" />
    <path d="M4 18h4" />
  </>,
);

export const IconChart = make(
  <>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20H2" />
  </>,
);

export const IconReport = make(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </>,
);

export const IconBook = make(
  <>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </>,
);

export const IconSettings = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.7a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>,
);

export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4.2-4.2" />
  </>,
);
export const IconMoon = make(<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />);
export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);
export const IconDownload = make(
  <>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 20h16" />
  </>,
);
export const IconPin = make(
  <>
    <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </>,
);
export const IconDroplet = make(
  <path d="M12 3s6 6.4 6 10.5A6 6 0 0 1 6 13.5C6 9.4 12 3 12 3z" />,
);
export const IconSediment = make(
  <>
    <path d="M3 8h18" />
    <path d="M3 13h18" />
    <path d="M3 18h18" />
    <path d="M7 8v10M15 8v10" />
  </>,
);
export const IconLeaf = make(
  <>
    <path d="M4 20c0-8 5-14 16-15 1 11-5 16-13 16H4z" />
    <path d="M4 20c3-5 7-8 12-10" />
  </>,
);
export const IconShield = make(
  <>
    <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);
export const IconAlert = make(
  <>
    <path d="M10.3 4.3 2.6 17.5A1.8 1.8 0 0 0 4.2 20h15.6a1.8 1.8 0 0 0 1.6-2.5L13.7 4.3a1.9 1.9 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
);
export const IconCheck = make(<path d="m5 12.5 4.5 4.5L19 7" />);
export const IconPlay = make(<path d="M8 5.5v13l11-6.5z" />);
export const IconArrowRight = make(
  <>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </>,
);
export const IconArrowLeft = make(
  <>
    <path d="M20 12H5" />
    <path d="m11 18-6-6 6-6" />
  </>,
);
export const IconPrinter = make(
  <>
    <path d="M7 9V4h10v5" />
    <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
    <rect x="7" y="14" width="10" height="7" rx="1" />
  </>,
);
export const IconDna = make(
  <>
    <path d="M7 3c0 6 10 6 10 12" />
    <path d="M17 3c0 6-10 6-10 12" />
    <path d="M7 21c0-2 .4-3.6 1.2-5M17 21c0-2-.4-3.6-1.2-5" />
    <path d="M8.5 6h7M8.5 18h7M7.2 13.5h9.6" />
  </>,
);
export const IconClose = make(<path d="M6 6l12 12M18 6 6 18" />);
export const IconCopy = make(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-6A2.5 2.5 0 0 0 4 5.5v6A2.5 2.5 0 0 0 6.5 14" />
  </>,
);
export const IconExternal = make(
  <>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M19 14v4.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-11A1.5 1.5 0 0 1 6.5 6H11" />
  </>,
);
export const IconDatabase = make(
  <>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
    <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </>,
);
export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </>,
);
export const IconLayers = make(
  <>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </>,
);
export const IconSparkle = make(
  <>
    <path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7l-1.6-5.5L5 10.6 10.4 9z" />
    <path d="M18.5 15.5 19.2 18l2.3.8-2.3.8-.7 2.4" />
  </>,
);
export const IconChevronDown = make(<path d="m6 9 6 6 6-6" />);
export const IconFilter = make(<path d="M3 5h18l-7 8v6l-4 2v-8z" />);
export const IconInfo = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </>,
);
export const IconTrend = make(
  <>
    <path d="M3 17l5.5-6 4 3.5L21 6" />
    <path d="M15 6h6v6" />
  </>,
);
export const IconTarget = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" />
  </>,
);
export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconLogo = ({ size = 28, className }: IconProps) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    fill="none"
    strokeLinecap="round"
    aria-hidden
    className={className}
  >
    <circle cx="16" cy="16" r="14" stroke="rgba(120, 220, 225, 0.35)" strokeWidth="1.2" />
    <path d="M4.5 11c4-4 7.5 4 11.5 0s7.5 4 11.5 0" stroke="#5fd3dc" strokeWidth="2" />
    <path d="M4.5 21c4-4 7.5 4 11.5 0s7.5 4 11.5 0" stroke="#68d391" strokeWidth="2" />
    <line x1="10" y1="7" x2="10" y2="25" stroke="rgba(226, 245, 247, 0.35)" strokeWidth="1.2" strokeDasharray="2 3" />
    <line x1="18" y1="7" x2="18" y2="25" stroke="rgba(226, 245, 247, 0.35)" strokeWidth="1.2" strokeDasharray="2 3" />
  </svg>
);
