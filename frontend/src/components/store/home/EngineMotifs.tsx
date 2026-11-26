/**
 * Hairline engine motif strip for the storefront home page.
 *
 * "Shop by category" and "Fan favourites" are both white, so with nothing
 * between them the page read as one long undifferentiated block. This is a
 * deliberately quiet divider: thin line-art of the machines we sell, no copy,
 * no colour blocks. It is decorative, so it is hidden from screen readers and
 * excluded from the accessible tree; the surrounding headings still carry the
 * structure of the page.
 */

type MotifProps = { className?: string };

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Piston, con-rod and pin — the simplest thing that says "engine". */
function PistonMotif({ className }: MotifProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <g {...line}>
        <rect x="13.5" y="6" width="13" height="9.5" rx="1.6" />
        <path d="M16.5 10h7" />
        <path d="M20 15.5v8" />
        <circle cx="20" cy="26" r="2.6" />
        <path d="M11 31h18" />
        <path d="M14.5 34.5h11" />
      </g>
    </svg>
  );
}

/** Flywheel with spokes — the part owners see spinning. */
function FlywheelMotif({ className }: MotifProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <g {...line}>
        <circle cx="20" cy="20" r="12" />
        <circle cx="20" cy="20" r="2.4" />
        <path d="M20 17.6V8M17.9 21.2l-8.4 4.9M22.1 21.2l8.4 4.9" />
      </g>
    </svg>
  );
}

/** V-block: two cylinder banks on a crankcase. */
function VBlockMotif({ className }: MotifProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <g {...line}>
        <path d="M14.5 19.5 18 8.5h4l3.5 11" />
        <path d="M12.5 21.5h15v6h-15z" />
        <path d="M15.5 27.5v3.5M24.5 27.5v3.5" />
        <path d="M18.4 12.6h3.2M17.6 16.2h4.8" />
      </g>
    </svg>
  );
}

/** Steam boiler with a gauge on the dome. */
function BoilerMotif({ className }: MotifProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <g {...line}>
        <rect x="5.5" y="16" width="29" height="13" rx="6.5" />
        <path d="M14 16v-3.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V16" />
        <circle cx="20" cy="20.5" r="3" />
        <path d="M20 20.5V18.8" />
        <path d="M29 29v4M11 29v4" />
      </g>
    </svg>
  );
}

/** Crankshaft: journal circle, web, counterweight. */
function CrankshaftMotif({ className }: MotifProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <g {...line}>
        <circle cx="15" cy="20" r="5.5" />
        <circle cx="27" cy="20" r="2.6" />
        <path d="M20.5 20h3.9" />
        <path d="M6.5 20h3M32.5 20h3" />
        <path d="M15 14.5V10" />
      </g>
    </svg>
  );
}

/** Spur gear — mods and spare parts. */
function GearMotif({ className }: MotifProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <g {...line}>
        <circle cx="20" cy="20" r="8.5" />
        <circle cx="20" cy="20" r="3" />
        <path d="M20 8.6V5.4M20 34.6v-3.2M8.6 20H5.4M34.6 20h-3.2M11.9 11.9 9.7 9.7M30.3 30.3l-2.2-2.2M28.1 11.9l2.2-2.2M9.7 30.3l2.2-2.2" />
      </g>
    </svg>
  );
}

/** Single-cylinder flame licker / hot-air engine silhouette. */
function StirlingMotif({ className }: MotifProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <g {...line}>
        <path d="M9 28.5h17" />
        <path d="M12 28.5V17h8v11.5" />
        <circle cx="27" cy="25" r="5.5" />
        <path d="M27 19.5V17h-7" />
        <path d="M10.5 13.5c0-2 1.6-2.5 1.6-4.5" />
      </g>
    </svg>
  );
}

/** Chassis with two wheels — the RC shelf. */
function ChassisMotif({ className }: MotifProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <g {...line}>
        <path d="M8.5 24.5v-4l4-5h12l4 5v4" />
        <circle cx="13" cy="26.5" r="3.4" />
        <circle cx="27.5" cy="26.5" r="3.4" />
        <path d="M16.4 26.5h7.7M8.5 21.5h22" />
      </g>
    </svg>
  );
}

const MOTIFS = [
  { key: 'piston', Motif: PistonMotif, hideBelow: '' },
  { key: 'flywheel', Motif: FlywheelMotif, hideBelow: 'hidden sm:block' },
  { key: 'v-block', Motif: VBlockMotif, hideBelow: '' },
  { key: 'boiler', Motif: BoilerMotif, hideBelow: 'hidden md:block' },
  { key: 'crankshaft', Motif: CrankshaftMotif, hideBelow: 'hidden lg:block' },
  { key: 'gear', Motif: GearMotif, hideBelow: '' },
  { key: 'stirling', Motif: StirlingMotif, hideBelow: 'hidden md:block' },
  { key: 'chassis', Motif: ChassisMotif, hideBelow: 'hidden xl:block' },
];

export default function EngineDivider() {
  return (
    <div className="bg-white" aria-hidden="true">
      <div className="kv-container">
        <div className="flex items-center justify-between gap-3 border-y border-[var(--site-line)] py-6 text-[var(--site-ink)]/30 sm:gap-6 sm:py-7 lg:py-8">
          {MOTIFS.map(({ key, Motif, hideBelow }) => (
            <Motif key={key} className={`h-8 w-8 shrink-0 sm:h-9 sm:w-9 lg:h-10 lg:w-10 ${hideBelow}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
