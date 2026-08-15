function MinusIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}

export default function PartyCounterCard({ name, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-[clamp(1.25rem,2.5vh,2.25rem)] bg-[var(--cw-card,#fff)] px-[clamp(1.25rem,2.5vw,2.25rem)] py-[clamp(0.7rem,2vh,1.35rem)] shadow-[0_8px_30px_rgba(120,100,180,0.08)]">
      <span className="text-[clamp(1.15rem,2.8vh,1.7rem)] font-extrabold text-[var(--cw-text,#1f1a33)]">
        {name}
      </span>
      <div className="flex items-center gap-[clamp(0.75rem,1.8vw,1.5rem)]">
        <button
          type="button"
          onClick={() => onChange(-1)}
          disabled={value <= 0}
          aria-label="decrease"
          className="flex h-[clamp(2.75rem,6.5vh,4.1rem)] w-[clamp(2.75rem,6.5vh,4.1rem)] items-center justify-center rounded-full bg-[var(--cw-panel-alt,#efeafc)] text-[var(--cw-accent,#5a4b8a)] transition enabled:active:scale-95 disabled:opacity-35"
        >
          <MinusIcon className="h-[clamp(1.25rem,3vh,2rem)] w-[clamp(1.25rem,3vh,2rem)]" />
        </button>
        <span className="min-w-10 text-center text-[clamp(1.35rem,3.5vh,2.25rem)] font-extrabold text-[var(--cw-text,#1f1a33)]">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(1)}
          aria-label="increase"
          className="flex h-[clamp(2.75rem,6.5vh,4.1rem)] w-[clamp(2.75rem,6.5vh,4.1rem)] items-center justify-center rounded-full bg-[var(--cw-panel-alt,#efeafc)] text-[var(--cw-accent,#5a4b8a)] transition active:scale-95"
        >
          <PlusIcon className="h-[clamp(1.25rem,3vh,2rem)] w-[clamp(1.25rem,3vh,2rem)]" />
        </button>
      </div>
    </div>
  );
}
