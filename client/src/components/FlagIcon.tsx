import React from 'react';

type FlagCode = 'hy' | 'ru' | 'en';

interface FlagIconProps {
  code: FlagCode;
  className?: string;
  title?: string;
  size?: number;
}

// Simple inline SVG flags (stylized, minimal). Each fits a 4:3 viewBox.
export const FlagIcon: React.FC<FlagIconProps> = ({ code, className = '', title, size = 24 }) => {
  const common = { width: size, height: (size * 3) / 4, viewBox: '0 0 4 3' } as const;
  let svg: React.ReactNode;
  switch (code) {
    case 'hy': // Armenia 🇦🇲
      svg = (
        <svg {...common} className={className} aria-label={title || 'Armenian'} role="img">
          <title>{title || 'Armenian'}</title>
          <rect width="4" height="3" fill="#D90012" />
          <rect width="4" height="2" fill="#0033A0" />
          <rect width="4" height="1" fill="#F2A800" />
        </svg>
      );
      break;
    case 'ru': // Russia 🇷🇺
      svg = (
        <svg {...common} className={className} aria-label={title || 'Russian'} role="img">
          <title>{title || 'Russian'}</title>
          <rect width="4" height="3" fill="#fff" />
          <rect width="4" height="2" fill="#0039A6" />
          <rect width="4" height="1" fill="#D52B1E" />
        </svg>
      );
      break;
    case 'en': // USA simplified 🇺🇸 (stylized: top-left blue + stripes)
      svg = (
        <svg {...common} className={className} aria-label={title || 'English'} role="img">
          <title>{title || 'English'}</title>
          <rect width="4" height="3" fill="#B22234" />
          <g fill="#fff">
            <rect y="0.3" width="4" height="0.3" />
            <rect y="0.9" width="4" height="0.3" />
            <rect y="1.5" width="4" height="0.3" />
            <rect y="2.1" width="4" height="0.3" />
            <rect y="2.7" width="4" height="0.3" />
          </g>
          <rect width="1.6" height="1.2" fill="#3C3B6E" />
        </svg>
      );
      break;
    default:
      svg = null;
  }
  return <>{svg}</>;
};

export default FlagIcon;