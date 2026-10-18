/** Motif kawung (batik khas Yogyakarta) sebagai tekstur halus. */
export function Kawung({ id, warna = "#f5b800", className, style }: { id: string; warna?: string; className?: string; style?: React.CSSProperties }) {
  const elips = [
    [11, 11, 45],
    [31, 11, -45],
    [11, 31, -45],
    [31, 31, 45],
  ];
  return (
    <svg className={className} style={style} aria-hidden>
      <defs>
        <pattern id={id} width="42" height="42" patternUnits="userSpaceOnUse">
          {elips.map(([x, y, r]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="10" ry="5" transform={`rotate(${r} ${x} ${y})`} fill="none" stroke={warna} strokeWidth="1.4" />
          ))}
          <circle cx="21" cy="21" r="1.8" fill={warna} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Logo kecil: empat titik, satu berwarna emas. */
export function Logo({ terang = false }: { terang?: boolean }) {
  const dasar = terang ? "bg-white" : "bg-primary";
  return (
    <span className="inline-grid grid-cols-2 gap-[3px]" aria-hidden>
      <span className={`size-[7px] rounded-full ${dasar}`} />
      <span className="size-[7px] rounded-full bg-accent" />
      <span className={`size-[7px] rounded-full ${dasar} opacity-40`} />
      <span className={`size-[7px] rounded-full ${dasar}`} />
    </span>
  );
}
