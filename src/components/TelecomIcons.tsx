import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  color?: string;
}

/**
 * Telecom Cell Tower (Menara BTS Seluler) SVG Icon
 * Features antenna spire, cross-bracing lattice structure, transmitter panels, and signal broadcast waves.
 */
export const TowerIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  color = 'currentColor',
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Tower Mast Spire / Antenna Top */}
      <line x1="12" y1="2" x2="12" y2="7" />
      <circle cx="12" cy="2.5" r="1" fill={color} />

      {/* Crossbars / Microwave Transceiver Platform */}
      <line x1="8.5" y1="7" x2="15.5" y2="7" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="5.5" y1="17" x2="18.5" y2="17" />

      {/* Main Lattice Legs (A-frame tower) */}
      <path d="M10 7L5 22" />
      <path d="M14 7L19 22" />

      {/* Diagonal Lattice Braces */}
      <line x1="9" y1="9.5" x2="15" y2="12" />
      <line x1="15" y1="9.5" x2="9" y2="12" />
      <line x1="7.5" y1="14.5" x2="16.5" y2="17" />
      <line x1="16.5" y1="14.5" x2="7.5" y2="17" />

      {/* Broadcast Signal Radio Waves (Left & Right) */}
      <path d="M5.5 4.5A4.5 4.5 0 0 0 3 8" strokeWidth="1.5" strokeOpacity="0.85" />
      <path d="M18.5 4.5A4.5 4.5 0 0 1 21 8" strokeWidth="1.5" strokeOpacity="0.85" />
      <path d="M7 2A7 7 0 0 0 2 6" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="1 1.5" />
      <path d="M17 2A7 7 0 0 1 22 6" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="1 1.5" />
    </svg>
  );
};

/**
 * Grid Network Icon (Poligon Hex / Grid Telecommunication)
 */
export const GridPolygonIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  color = 'currentColor',
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      {...props}
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <line x1="10" y1="6.5" x2="14" y2="6.5" strokeDasharray="1 1" />
      <line x1="10" y1="17.5" x2="14" y2="17.5" strokeDasharray="1 1" />
      <line x1="6.5" y1="10" x2="6.5" y2="14" strokeDasharray="1 1" />
      <line x1="17.5" y1="10" x2="17.5" y2="14" strokeDasharray="1 1" />
    </svg>
  );
};

/**
 * Generates an HTML string for Leaflet L.divIcon with a crisp telecom tower marker
 * Features a pin teardrop / badge shape with the revenue flag background color
 * and an embossed white telecom tower glyph inside.
 */
export const generateTowerMarkerHtml = (
  color: string,
  label?: string
): string => {
  return `
    <div class="tower-marker-container group relative flex flex-col items-center cursor-pointer select-none">
      <!-- Pin Badge Body (Static, no pulsing / no lag) -->
      <div class="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-md relative" style="background-color: ${color};">
        <!-- Telecom Tower SVG Glyph -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Spire -->
          <line x1="12" y1="2" x2="12" y2="6" />
          <circle cx="12" cy="2.5" r="1.2" fill="#ffffff" />
          <!-- Crossbars -->
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="6.5" y1="12" x2="17.5" y2="12" />
          <!-- Legs -->
          <path d="M9.5 7L4.5 22" />
          <path d="M14.5 7L19.5 22" />
          <!-- X-bracing -->
          <line x1="8.5" y1="9.5" x2="15.5" y2="12" />
          <line x1="15.5" y1="9.5" x2="8.5" y2="12" />
          <line x1="7" y1="15" x2="17" y2="17" />
          <line x1="17" y1="15" x2="7" y2="17" />
          <!-- Signals -->
          <path d="M4.5 4A4 4 0 0 0 2 8" stroke-width="1.8" />
          <path d="M19.5 4A4 4 0 0 1 22 8" stroke-width="1.8" />
        </svg>
      </div>

      <!-- Pin Tip Needle -->
      <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] -mt-[1px]" style="border-t-color: ${color};"></div>

      <!-- Optional hover tooltip preview label -->
      ${
        label
          ? `<span class="hidden group-hover:block absolute -top-6 whitespace-nowrap bg-slate-900 text-white font-mono text-[9px] px-1.5 py-0.5 rounded border border-slate-700 shadow-md">${label}</span>`
          : ''
      }
    </div>
  `;
};
