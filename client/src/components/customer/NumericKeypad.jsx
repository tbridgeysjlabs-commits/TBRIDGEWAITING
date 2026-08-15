const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'reset', '0', 'back'];

const KEY_GLYPH =
  'inline-flex h-[min(100%,2.9rem)] min-h-[40px] min-w-[40px] items-center justify-center text-[clamp(1.2rem,3.2vh,2.1rem)] leading-none';

const ICON_GLYPH =
  'inline-flex h-[min(100%,2.9rem)] min-h-[40px] min-w-[40px] items-center justify-center text-[clamp(1.55rem,4.2vh,2.75rem)] leading-none text-[var(--cw-text-muted,#6b7280)]';

const BACK_GLYPH =
  'inline-flex h-[min(100%,2.9rem)] min-h-[40px] min-w-[40px] items-center justify-center text-[clamp(1.2rem,3.2vh,2.1rem)] leading-none text-[var(--cw-text-muted,#6b7280)]';

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function BackspaceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5H5.5A2.5 2.5 0 0 0 3.2 6.4L1 12l2.2 5.6A2.5 2.5 0 0 0 5.5 19H12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
      <path d="m15.5 9.5 5 5" />
      <path d="m20.5 9.5-5 5" />
    </svg>
  );
}

export default function NumericKeypad({ onKey }) {
  return (
    <div className="grid h-full min-h-0 w-full grid-cols-3 grid-rows-4 gap-[clamp(0.25rem,0.8vh,0.65rem)]">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          className="flex min-h-[40px] items-center justify-center overflow-hidden rounded-[clamp(0.55rem,1.35vh,1.2rem)] bg-[var(--cw-keypad-key,#F4F2FC)] font-bold text-[var(--cw-text,#2d2d2d)] transition hover:brightness-110 active:scale-[0.98]"
        >
          {key === 'reset' ? (
            <span className={ICON_GLYPH} aria-label="새로고침">
              <RefreshIcon />
            </span>
          ) : key === 'back' ? (
            <span className={BACK_GLYPH} aria-label="지우기">
              <BackspaceIcon />
            </span>
          ) : (
            <span className={KEY_GLYPH}>{key}</span>
          )}
        </button>
      ))}
    </div>
  );
}
