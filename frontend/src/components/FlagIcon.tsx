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
    case 'hy': // Armenia 🇦🇲 (горизонтальные полосы: красный, синий, оранжевый)
      svg = (
        <svg {...common} className={className} aria-label={title || 'Armenian'} role="img">
          <title>{title || 'Armenian'}</title>
          {/* Красная полоса сверху */}
          <rect x="0" y="0" width="4" height="1" fill="#D90012" />
          {/* Синяя полоса в середине */}
          <rect x="0" y="1" width="4" height="1" fill="#0033A0" />
          {/* Оранжевая полоса снизу */}
          <rect x="0" y="2" width="4" height="1" fill="#F2A800" />
        </svg>
      );
      break;
    case 'ru': // Russia 🇷🇺 (горизонтальные полосы: белый, синий, красный)
      svg = (
        <svg {...common} className={className} aria-label={title || 'Russian'} role="img">
          <title>{title || 'Russian'}</title>
          {/* Белая полоса сверху */}
          <rect x="0" y="0" width="4" height="1" fill="#fff" />
          {/* Синяя полоса в середине */}
          <rect x="0" y="1" width="4" height="1" fill="#0039A6" />
          {/* Красная полоса снизу */}
          <rect x="0" y="2" width="4" height="1" fill="#D52B1E" />
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