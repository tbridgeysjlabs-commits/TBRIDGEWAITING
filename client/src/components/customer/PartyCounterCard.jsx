function MinusIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 12h12" />
    </svg>
  );
}

function PlusIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}

export default function PartyCounterCard({ name, value, onChange, description }) {
  const canDecrease = value > 0;
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--cw-border,rgba(255,255,255,0.08))] bg-[var(--cw-card,#1A1A24)] px-[clamp(1.1rem,2.2vw,1.75rem)] py-[clamp(0.85rem,2.2vh,1.35rem)]">
      <div className="min-w-0">
        <div className="truncate text-[clamp(1.05rem,2.4vh,1.35rem)] font-bold text-[var(--cw-text,#fff)]">
          {name}
        </div>
        {description ? (
          <div className="mt-0.5 truncate text-[clamp(0.75rem,1.6vh,0.9rem)] text-[var(--cw-text-muted,#9CA3AF)]">
            {description}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-[clamp(0.65rem,1.5vw,1.1rem)]">
        <button
          type="button"
          onClick={() => onChange(-1)}
          disabled={!canDecrease}
          aria-label="decrease"
          className={`flex h-[clamp(2.5rem,5.5vh,3.25rem)] w-[clamp(2.5rem,5.5vh,3.25rem)] items-center justify-center rounded-xl transition enabled:active:scale-95 ${
            canDecrease
              ? 'bg-[var(--cw-panel-alt,#22222E)] text-[var(--cw-text,#fff)]'
              : 'bg-[var(--cw-panel-alt,#22222E)] text-[var(--cw-disabled-fg,#6B7280)] opacity-50'
          }`}
        >
          <MinusIcon className="h-5 w-5" />
        </button>
        <span className="min-w-8 text-center text-[clamp(1.35rem,3.2vh,1.85rem)] font-extrabold tabular-nums text-[var(--cw-text,#fff)]">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(1)}
          aria-label="increase"
          className="flex h-[clamp(2.5rem,5.5vh,3.25rem)] w-[clamp(2.5rem,5.5vh,3.25rem)] items-center justify-center rounded-xl bg-[var(--cw-accent-deep,#7C3AED)] text-white transition active:scale-95"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
