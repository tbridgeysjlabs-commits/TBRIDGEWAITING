const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'reset', '0', 'back'];

const KEY_GLYPH =
  'inline-flex h-[min(100%,2.9rem)] min-h-[40px] min-w-[40px] items-center justify-center text-[clamp(1.2rem,3.2vh,2.1rem)] leading-none';

const ICON_GLYPH =
  'inline-flex h-[min(100%,2.9rem)] min-h-[40px] min-w-[40px] items-center justify-center text-[clamp(1.2rem,3.2vh,2.1rem)] leading-none text-[var(--cw-text-muted,#9CA3AF)]';

const KEY_BTN =
  'flex min-h-[40px] items-center justify-center overflow-hidden rounded-[clamp(0.55rem,1.35vh,1.2rem)] border border-[var(--cw-border,rgba(255,255,255,0.06))] bg-[var(--cw-keypad-key,#1A1A24)] font-bold text-[var(--cw-text,#fff)] transition-[transform,filter,background-color] duration-125 ease-out hover:brightness-110 active:scale-[0.96] active:brightness-95';

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

/** 왼쪽 화살표(←) — 숫자 버튼과 시각적 균형 */
function BackspaceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

export default function NumericKeypad({ onKey }) {
  return (
    <div className="grid h-full min-h-0 w-full grid-cols-3 grid-rows-4 gap-[clamp(0.25rem,0.8vh,0.65rem)]">
      {KEYS.map((key) => (
        <button key={key} type="button" onClick={() => onKey(key)} className={KEY_BTN}>
          {key === 'reset' ? (
            <span className={ICON_GLYPH} aria-label="새로고침">
              <RefreshIcon />
            </span>
          ) : key === 'back' ? (
            <span className={ICON_GLYPH} aria-label="지우기">
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
