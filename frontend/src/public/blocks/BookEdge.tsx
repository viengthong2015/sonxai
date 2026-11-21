/**
 * The open book from the school logo: three page edges (sky blue, green, magenta) sweeping
 * down to meet in a V, with the white page below. Placed at the bottom of a lapis section.
 */
const curve = (y0: number, y1: number) => `M0,${y0} C430,${y0} 650,${y1 - 30} 720,${y1} C790,${y1 - 30} 1010,${y0} 1440,${y0}`;

export function BookEdge({ className = 'h-12 sm:h-16 lg:h-24', fill = '#ffffff' }: { className?: string; fill?: string }) {
  return (
    <svg className={`block w-full ${className}`} viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={curve(18, 74)} fill="none" stroke="#5B9BE6" strokeWidth="6" />
      <path d={curve(26, 82)} fill="none" stroke="#4CAF3F" strokeWidth="6" />
      <path d={curve(34, 90)} fill="none" stroke="#C2187A" strokeWidth="6" />
      <path d={`${curve(40, 96)} L1440,100 L0,100 Z`} fill={fill} />
    </svg>
  );
}
