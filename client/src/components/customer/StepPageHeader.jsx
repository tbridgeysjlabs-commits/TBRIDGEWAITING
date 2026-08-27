/** 공통 뒤로가기 + 선택적 3단계 진행 바
 * step: 1 | 2 | 3 (현재 단계, 1-based)
 */
export default function StepPageHeader({ title, onBack, step }) {
  return (
    <header className="relative mb-[clamp(0.35rem,1vh,0.75rem)] flex shrink-0 flex-col items-center overflow-hidden">
      <div className="relative mb-[20px] flex h-[clamp(3rem,7vh,4rem)] w-full items-center justify-center">
        <button
          type="button"
          onClick={onBack}
          aria-label="back"
          className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cw-panel-alt,#22222E)] text-[var(--cw-text,#fff)] transition active:scale-95"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <h1 className="px-14 text-center text-[clamp(1.15rem,2.8vh,1.75rem)] font-extrabold text-[var(--cw-text,#fff)]">
          {title}
        </h1>
      </div>
      {step >= 1 && step <= 3 ? (
        <div
          className="mt-1 flex w-full max-w-[220px] gap-1.5"
          aria-hidden
        >
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-[3px] flex-1 rounded-full transition-colors ${
                n === step
                  ? 'bg-[var(--cw-accent-deep,#7C3AED)]'
                  : 'bg-[var(--cw-panel-alt,#2A2A36)]'
              }`}
            />
          ))}
        </div>
      ) : null}
    </header>
  );
}
