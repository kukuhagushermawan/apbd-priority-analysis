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
