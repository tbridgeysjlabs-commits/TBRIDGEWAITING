export default function WaitingStatusRing({ label, count, unit }) {
  return (
    <div className="relative mx-auto flex aspect-square h-[clamp(8.5rem,26vh,17rem)] w-[clamp(8.5rem,26vh,17rem)] items-center justify-center">
      <div className="cw-ring-gradient absolute inset-0 rounded-full opacity-80" />
      <div className="absolute inset-[clamp(10px,2vh,18px)] rounded-full border border-[var(--cw-accent,#f0ebff)] opacity-40" />
      <div className="relative z-10 flex flex-col items-center px-2">
        <div className="mb-[clamp(0.15rem,0.6vh,0.5rem)] flex items-center gap-1.5 text-[clamp(0.7rem,1.6vh,1.1rem)] font-medium text-[var(--cw-accent,#9b87f5)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--cw-accent,#9b87f5)]" />
          {label}
        </div>
        <div className="flex items-end gap-1 leading-none">
          <strong className="text-[clamp(2.5rem,8vh,5.5rem)] font-extrabold tracking-tight text-[var(--cw-text,#2a2150)]">
            {count}
          </strong>
          <span className="mb-[clamp(0.35rem,1vh,0.85rem)] text-[clamp(0.95rem,2.4vh,1.75rem)] font-bold text-[var(--cw-text,#2a2150)]">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
