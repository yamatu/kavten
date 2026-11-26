/**
 * Hairline engine line-art, used as a background texture inside the white
 * storefront sections.
 *
 * "Shop by category" and "Fan favourites" are both plain white, and with
 * nothing in them the page read as one long undifferentiated block. Rather
 * than a coloured band or a strip between the sections, the texture lives
 * *inside* each white section: single-stroke technical drawings of the
 * machines we sell, tiled at a very low opacity so the white stays white and
 * the cards keep their contrast.
 *
 * It is decoration only: `aria-hidden`, `focusable="false"`, no text, and it
 * never sits above the content (pointer-events-none, painted first).
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** One motif drawn in a 0 0 40 40 box, positioned by the pattern below. */
function Motif({ x, y, rotate = 0, scale = 1, children }: { x: number; y: number; rotate?: number; scale?: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} {...stroke}>
      {children}
    </g>
  );
}

/** Piston, con-rod and pin — the simplest thing that says "engine". */
export const piston = (
  <>
    <rect x="13.5" y="6" width="13" height="9.5" rx="1.6" />
    <path d="M16.5 10h7" />
    <path d="M20 15.5v8" />
    <circle cx="20" cy="26" r="2.6" />
    <path d="M11 31h18" />
    <path d="M14.5 34.5h11" />
  </>
);

/** Flywheel with spokes — the part owners see spinning. */
export const flywheel = (
  <>
    <circle cx="20" cy="20" r="12" />
    <circle cx="20" cy="20" r="2.4" />
    <path d="M20 17.6V8M17.9 21.2l-8.4 4.9M22.1 21.2l8.4 4.9" />
  </>
);

/** V-block: two cylinder banks on a crankcase. */
export const vBlock = (
  <>
    <path d="M14.5 19.5 18 8.5h4l3.5 11" />
    <path d="M12.5 21.5h15v6h-15z" />
    <path d="M15.5 27.5v3.5M24.5 27.5v3.5" />
    <path d="M18.4 12.6h3.2M17.6 16.2h4.8" />
  </>
);

/** Steam boiler with a gauge on the dome. */
export const boiler = (
  <>
    <rect x="5.5" y="16" width="29" height="13" rx="6.5" />
    <path d="M14 16v-3.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V16" />
    <circle cx="20" cy="20.5" r="3" />
    <path d="M20 20.5V18.8" />
    <path d="M29 29v4M11 29v4" />
  </>
);

/** Crankshaft: journal circle, web, counterweight. */
export const crankshaft = (
  <>
    <circle cx="15" cy="20" r="5.5" />
    <circle cx="27" cy="20" r="2.6" />
    <path d="M20.5 20h3.9" />
    <path d="M6.5 20h3M32.5 20h3" />
    <path d="M15 14.5V10" />
  </>
);

/** Spur gear — mods and spare parts. */
export const gear = (
  <>
    <circle cx="20" cy="20" r="8.5" />
    <circle cx="20" cy="20" r="3" />
    <path d="M20 8.6V5.4M20 34.6v-3.2M8.6 20H5.4M34.6 20h-3.2M11.9 11.9 9.7 9.7M30.3 30.3l-2.2-2.2M28.1 11.9l2.2-2.2M9.7 30.3l2.2-2.2" />
  </>
);

/** Single-cylinder hot-air engine silhouette. */
export const stirling = (
  <>
    <path d="M9 28.5h17" />
    <path d="M12 28.5V17h8v11.5" />
    <circle cx="27" cy="25" r="5.5" />
    <path d="M27 19.5V17h-7" />
    <path d="M10.5 13.5c0-2 1.6-2.5 1.6-4.5" />
  </>
);

/** Chassis with two wheels — the RC shelf. */
export const chassis = (
  <>
    <path d="M8.5 24.5v-4l4-5h12l4 5v4" />
    <circle cx="13" cy="26.5" r="3.4" />
    <circle cx="27.5" cy="26.5" r="3.4" />
    <path d="M16.4 26.5h7.7M8.5 21.5h22" />
  </>
);

/** Sparse tile: motifs are spread out so the texture never competes with text. */
function EngineTile({ id }: { id: string }) {
  return (
    <pattern id={id} width="240" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">
      <Motif x={-4} y={6} rotate={-4} scale={1.7}>
        {piston}
      </Motif>
      <Motif x={150} y={-6} rotate={9} scale={1.35}>
        {gear}
      </Motif>
      <Motif x={22} y={128} rotate={5} scale={1.45}>
        {boiler}
      </Motif>
      <Motif x={140} y={132} rotate={-7} scale={1.55}>
        {flywheel}
      </Motif>
      <Motif x={72} y={78} rotate={-14} scale={1}>
        {crankshaft}
      </Motif>
      <Motif x={100} y={188} rotate={6} scale={1.15}>
        {vBlock}
      </Motif>
      <Motif x={2} y={212} rotate={-8} scale={1}>
        {stirling}
      </Motif>
    </pattern>
  );
}

/**
 * Full-bleed texture layer. Drop it inside a `relative overflow-hidden`
 * section as the first child; content must be in a `relative` wrapper above it.
 */
export default function EnginePattern({
  id,
  className = 'opacity-[0.085]',
}: {
  id: string;
  className?: string;
}) {
  const patternId = `kv-engine-${id}`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute inset-0 h-full w-full text-[var(--site-ink)] ${className}`}
      preserveAspectRatio="none"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.75) 18%, #000 45%, rgba(0,0,0,0.55) 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.75) 18%, #000 45%, rgba(0,0,0,0.55) 100%)',
      }}
    >
      <defs>
        <EngineTile id={patternId} />
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
